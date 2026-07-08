export function createThreadsCore(config) {
    const {
        elements,
        api,
        isAdmin = false,
        adminHandlers = {},
        currentUserId,
        currentUsername
    } = config;

    const {
        joinedThreadsList,
        onlineUsers,
        pinsPanel,
        pinsList,
        attachmentPreview
    } = elements;

    const socket = io();
    const pageContainer = document.querySelector(".threads-container");
    const threadsFeedCard = document.getElementById("threadsFeedCard");

    let currentThread = null;
    let currentThreadData = null;
    let allThreads = [];
    let onlineUsersList = [];
    let selectedFiles = [];
    let activeAttachmentPreview = attachmentPreview;

    function getRelativeTime(timestamp) {
        if (!timestamp) return "";

        const now = Date.now();
        const time = new Date(timestamp).getTime();
        const diff = Math.floor((now - time) / 1000);

        if (diff < 10) return "just now";
        if (diff < 60) return `${diff}s ago`;

        const minutes = Math.floor(diff / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        return `${Math.floor(hours / 24)}d ago`;
    }

    function updateTimestamps() {
        pageContainer?.querySelectorAll(".timestamp")
            .forEach(el => {
                const time =
                    el.getAttribute("data-time");
                el.textContent = ` // ${getRelativeTime(time)}`;
            });
    }

    setInterval(updateTimestamps, 60000);

    async function safeFetch(url, options = {}) {
        if (!url) return null;

        try {
            const res = await fetch(url, {
                credentials: "include",
                ...options
            });

            if (!res.ok) return null;

            return await res.json();
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    function buildApiPaths() {
        const defaultApi = {
            threads:
                api.threads || "/threads/api",
            createThread:
                api.createThread || "/threads/api/create",
            threadMessages:
                api.threadMessages || api.messages || ((threadId) => `/threads/api/${threadId}/messages`),
            sendThreadMessage:
                api.sendThreadMessage || ((threadId) => `/threads/api/${threadId}/send`),
            threadPins:
                api.threadPins || ((threadId) => `/threads/api/${threadId}/pins`),
            deleteThread:
                api.deleteThread || ((threadId) => `/threads/api/admin/thread/${threadId}`),
            toggleThreadPin:
                api.toggleThreadPin || ((threadId) => `/threads/api/admin/thread/${threadId}/pin`),
            toggleThreadLock:
                api.toggleThreadLock || ((threadId) => `/threads/api/admin/thread/${threadId}/lock`),
            deleteMessage:
                api.deleteMessage || ((messageId) => `/threads/api/admin/message/${messageId}`),
            pinMessage:
                api.pinMessage || ((messageId) => `/threads/api/admin/message/${messageId}/pin`),
            unpinMessage:
                api.unpinMessage || ((messageId) => `/threads/api/admin/message/${messageId}/pin`),
            deleteAttachment:
                api.deleteAttachment || ((attachmentId) => `/threads/api/admin/attachment/${attachmentId}`)
        };

        return {
            ...api,
            ...defaultApi
        };
    }

    const resolvedApi = buildApiPaths();

    function getImageAttachments(item) {
        if (!Array.isArray(item?.attachments)) return [];
        return item.attachments.filter(attachment => attachment?.image_url);
    }

    function openAttachmentImage(imageUrl) {
        if (window.openImageModal) {
            window.openImageModal(imageUrl);
            return;
        }

        window.open(imageUrl, "_blank");
    }

    function createStatusBadges(item) {
        const badges = document.createElement("div");
        badges.className = "status-badges";

        if (item?.is_pinned) {
            const pinned = document.createElement("span");
            pinned.className = "status-badge pinned-label";
            pinned.textContent = "PINNED";
            badges.appendChild(pinned);
        }

        if (item?.is_locked) {
            const locked = document.createElement("span");
            locked.className = "status-badge locked-label";
            locked.textContent = "LOCKED";
            badges.appendChild(locked);
        }

        return badges;
    }

    function switchToFeed() {
        const feedTemplate = document.getElementById("threadsFeedTemplate");
        pageContainer.innerHTML = feedTemplate.innerHTML;
        activeAttachmentPreview =
            pageContainer.querySelector(".attachment-preview") ||
            attachmentPreview;
        selectedFiles = [];

        if (currentThread) {
            socket.emit("leave:thread", currentThread);
            currentThread = null;
            currentThreadData = null;
        }

        setupFeedListeners();
        loadThreads();
    }

    function setupFeedListeners() {
        const submitBtn = pageContainer.querySelector("#submitThreadBtn");
        const threadAttachBtn = pageContainer.querySelector("#threadAttachBtn");
        const threadImageInput = pageContainer.querySelector("#threadImageInput");
        const titleInput = pageContainer.querySelector("#threadTitle");
        const contentInput = pageContainer.querySelector("#threadContent");

        selectedFiles = [];
        renderAttachmentPreview();

        submitBtn?.addEventListener("click", async () => {
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();

            if (!title || !content) return;

            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);
            selectedFiles.forEach(file => {
                formData.append("images", file);
            });

            const created = await safeFetch(resolvedApi.createThread, {
                method: "POST",
                body: formData
            });

            if (!created) return;

            titleInput.value = "";
            contentInput.value = "";
            selectedFiles = [];
            renderAttachmentPreview();

            if (threadImageInput) {
                threadImageInput.value = "";
            }
        });

        threadAttachBtn?.addEventListener("click", () => {
            threadImageInput?.click();
        });

        threadImageInput?.addEventListener("change", (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            selectedFiles = [
                ...selectedFiles,
                ...files
            ];

            renderAttachmentPreview();
            threadImageInput.value = "";
        });

        activeAttachmentPreview?.addEventListener("click", removeSelectedAttachment);
    }

    function createThreadCard(thread) {
        const div = document.createElement("div");
        div.className = "post-card";
        div.dataset.threadId = thread.id;

        if (thread.is_pinned) div.classList.add("pinned-thread");
        if (thread.is_locked) div.classList.add("locked-thread");

        div.innerHTML = `
            <div class="post-card-body">
                <div class="post-card-main">
                    <div class="post-title"></div>
                    <div class="post-content"></div>
                    <div class="post-meta">
                        <span class="post-author"></span>
                        <span class="timestamp" data-time="${thread.created_at}">
                            // ${getRelativeTime(thread.created_at)}
                        </span>
                    </div>
                </div>
                <div class="post-gallery-slot"></div>
            </div>
        `;

        div.querySelector(".post-title").textContent = thread.title;
        div.querySelector(".post-content").textContent = thread.content;
        div.querySelector(".post-author").textContent = thread.username;

        const badges = createStatusBadges(thread);
        if (badges.children.length) {
            div.querySelector(".post-card-main").prepend(badges);
        }

        const attachments = getImageAttachments(thread);
        const gallerySlot = div.querySelector(".post-gallery-slot");

        if (attachments.length) {
            gallerySlot.appendChild(createPostGalleryPreview(attachments));
        }

        if (isAdmin) {
            div.appendChild(createThreadModerationMenu(thread));
        }

        div.addEventListener("click", (e) => {
            if (e.target.closest(".thread-moderation, .post-gallery-preview")) return;
            switchToThread(thread.id, thread);
        });

        return div;
    }

    function createThreadModerationMenu(thread) {
        const moderation = document.createElement("div");
        moderation.className = "thread-moderation";
        moderation.innerHTML = `
            <button class="message-menu-btn thread-menu-btn" type="button">⚙</button>
            <div class="message-menu thread-menu hidden">
                <button class="menu-action thread-pin-btn" data-id="${thread.id}">
                    ${thread.is_pinned ? "UNPIN THREAD" : "PIN THREAD"}
                </button>
                <button class="menu-action thread-lock-btn" data-id="${thread.id}">
                    ${thread.is_locked ? "UNLOCK THREAD" : "LOCK THREAD"}
                </button>
                <button class="menu-action delete-thread-btn" data-id="${thread.id}">
                    DELETE THREAD
                </button>
                <button class="menu-action inspect-btn" data-user="${thread.user_id || ""}">
                    INSPECT AUTHOR
                </button>
            </div>
        `;

        return moderation;
    }

    function renderFeed(threads) {
        const feed = pageContainer.querySelector("#threadsFeed");
        if (!feed) return;

        feed.innerHTML = "";
        threads.forEach(thread => {
            feed.appendChild(createThreadCard(thread));
        });

        updateTimestamps();
    }

    async function loadThreads() {
        const data = await safeFetch(resolvedApi.threads);
        if (!Array.isArray(data)) return;

        allThreads = data;
        renderFeed(data);
        updateJoinedThreadsList();
    }

    function switchToThread(threadId, threadData) {
        const roomTemplate = document.getElementById("threadRoomTemplate");
        pageContainer.innerHTML = roomTemplate.innerHTML;
        currentThread = threadId;
        currentThreadData = threadData;
        activeAttachmentPreview =
            pageContainer.querySelector("#attachmentPreview") ||
            attachmentPreview;
        selectedFiles = [];

        socket.emit("join:thread", threadId);
        setupThreadListeners(threadId, threadData);
        loadThreadMessages(threadId, threadData);

        const chatTitle = pageContainer.querySelector("#chatTitle");
        if (chatTitle && threadData) {
            chatTitle.textContent = `# ${threadData.title}`;
        }

        renderThreadHeaderState(threadData);
    }

    function renderThreadHeaderState(threadData) {
        const titleWrap = pageContainer.querySelector(".chat-header-title");
        const messageForm = pageContainer.querySelector("#messageForm");
        const messageInput = pageContainer.querySelector("#messageInput");
        const submitBtn = pageContainer.querySelector("#submitBtn");
        const attachBtn = pageContainer.querySelector("#attachBtn");

        if (titleWrap) {
            titleWrap.querySelector(".status-badges")?.remove();
            const badges = createStatusBadges(threadData);

            if (badges.children.length) {
                titleWrap.appendChild(badges);
            }
        }

        if (!isAdmin && threadData?.is_locked) {
            messageInput.placeholder = "Thread is locked";
            messageInput.disabled = true;
            submitBtn.disabled = true;
            attachBtn.disabled = true;
            messageForm.classList.add("locked-form");
        }
    }

    function setupThreadListeners(threadId) {
        const messageForm = pageContainer.querySelector("#messageForm");
        const messageInput = pageContainer.querySelector("#messageInput");
        const attachBtn = pageContainer.querySelector("#attachBtn");
        const imageInput = pageContainer.querySelector("#imageInput");
        const backBtn = pageContainer.querySelector("#backBtn");
        const pinsBtn = pageContainer.querySelector("#pinsBtn");
        const closePins = document.getElementById("closePins");

        renderAttachmentPreview();

        backBtn?.addEventListener("click", () => {
            switchToFeed();
        });

        attachBtn?.addEventListener("click", () => {
            if (!attachBtn.disabled) imageInput?.click();
        });

        imageInput?.addEventListener("change", (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            selectedFiles = [
                ...selectedFiles,
                ...files
            ];

            renderAttachmentPreview();
            imageInput.value = "";
        });

        messageForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const content = messageInput.value.trim();

            if (!content && !selectedFiles.length) return;

            const formData = new FormData();
            formData.append("content", content);
            selectedFiles.forEach(file => {
                formData.append("images", file);
            });

            const message = await safeFetch(
                resolvedApi.sendThreadMessage(threadId),
                {
                    method: "POST",
                    body: formData
                }
            );

            if (!message) return;

            messageInput.value = "";
            selectedFiles = [];
            renderAttachmentPreview();

            if (imageInput) {
                imageInput.value = "";
            }
        });

        activeAttachmentPreview?.addEventListener("click", removeSelectedAttachment);

        pinsBtn?.addEventListener("click", () => {
            openPinsPanel(threadId);
        });

        closePins?.addEventListener("click", () => {
            pinsPanel?.classList.add("hidden");
        });
    }

    function removeSelectedAttachment(e) {
        const removeBtn = e.target.closest(".remove-attachment");
        if (!removeBtn) return;

        selectedFiles.splice(Number(removeBtn.dataset.index), 1);
        renderAttachmentPreview();
    }

    function renderAttachmentPreview() {
        if (!activeAttachmentPreview) return;

        activeAttachmentPreview.innerHTML = "";

        if (!selectedFiles.length) {
            activeAttachmentPreview.classList.add("hidden");
            return;
        }

        activeAttachmentPreview.classList.remove("hidden");

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const item = document.createElement("div");
                item.className = "attachment-item";
                item.innerHTML = `
                    <img
                        src="${e.target.result}"
                        class="attachment-thumb"
                        style="cursor: pointer;"
                    >
                    <button
                        type="button"
                        class="remove-attachment"
                        data-index="${index}">
                        X
                    </button>
                `;

                item.querySelector(".attachment-thumb").addEventListener("click", () => {
                    window.openImageModal?.(e.target.result);
                });

                activeAttachmentPreview.appendChild(item);
            };

            reader.readAsDataURL(file);
        });
    }

    async function loadThreadMessages(threadId, threadData) {
        const messages = await safeFetch(resolvedApi.threadMessages(threadId));
        if (!Array.isArray(messages)) return;

        const messagesDiv = pageContainer.querySelector("#messages");
        if (!messagesDiv) return;

        messagesDiv.innerHTML = "";
        messagesDiv.appendChild(createMessageElement({
            ...threadData,
            id: `thread-${threadData.id}`,
            isThreadStarter: true
        }));

        messages.forEach(msg => {
            messagesDiv.appendChild(createMessageElement(msg));
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        updateTimestamps();
    }

    function createMessageElement(msg) {
        const wrapper = document.createElement("div");
        wrapper.className = "message";
        wrapper.dataset.messageId = msg.id;

        if (msg.isThreadStarter) wrapper.classList.add("thread-starter-message");
        if (msg.pinned) wrapper.classList.add("pinned");

        const userDiv = document.createElement("div");
        userDiv.className = "message-user";

        const usernameText = document.createElement("span");
        usernameText.textContent = msg.username;
        userDiv.appendChild(usernameText);

        const timestamp = document.createElement("span");
        timestamp.className = "timestamp";
        timestamp.setAttribute("data-time", msg.created_at);
        timestamp.textContent = ` // ${getRelativeTime(msg.created_at)}`;
        userDiv.appendChild(timestamp);

        if (msg.pinned) {
            userDiv.appendChild(createPinnedBadge());
        }

        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        contentDiv.textContent = msg.content;

        wrapper.appendChild(userDiv);
        wrapper.appendChild(contentDiv);

        const attachments = getImageAttachments(msg);
        if (attachments.length) {
            wrapper.appendChild(createMessageGallery(attachments));
        }

        if (isAdmin) {
            wrapper.appendChild(createMessageModerationMenu(msg));
        }

        return wrapper;
    }

    function createPinnedBadge() {
        const badge = document.createElement("span");
        badge.className = "message-pinned-badge";
        badge.textContent = "PINNED";
        return badge;
    }

    function createMessageModerationMenu(msg) {
        const moderation = document.createElement("div");
        moderation.className = "message-moderation";

        moderation.innerHTML = `
            <button class="message-menu-btn" type="button">⚙</button>
            <div class="message-menu hidden">
                ${!msg.isThreadStarter ? `
                    <button class="menu-action delete-btn" data-id="${msg.id}">
                        DELETE
                    </button>
                    ${isAdmin && msg.attachments.length > 0 ? `
                        <button class="menu-action image-delete-btn" 
                        data-id="${msg.id}" data-attachment-id="${msg.attachments[0].id}" >
                            DELETE IMAGE
                        </button>
                    ` : ""}
                    <button class="menu-action ${msg.pinned ? "unpin-btn" : "pin-btn"}" data-id="${msg.id}">
                        ${msg.pinned ? "UNPIN" : "PIN"}
                    </button>
                ` : ""}
                <button class="menu-action inspect-btn" data-user="${msg.user_id || ""}">
                    INSPECT
                </button>
            </div>
        `;

        return moderation;
    }

    function createMessageGallery(attachments) {
        const gallery = document.createElement("div");
        gallery.className = "message-gallery";

        attachments.forEach(attachment => {
            const frame = document.createElement("div");
            frame.className = "message-image-frame";
            frame.dataset.attachmentId = attachment.id;

            const img = document.createElement("img");
            img.src = attachment.image_url;
            img.className = "message-image";
            img.loading = "lazy";
            img.style.cursor = "pointer";
            img.addEventListener("click", () => openAttachmentImage(attachment.image_url));
            frame.appendChild(img);

            gallery.appendChild(frame);
        });

        return gallery;
    }

    function createPostGalleryPreview(attachments) {
        const gallery = document.createElement("div");
        gallery.className = "post-gallery-preview";
        gallery.innerHTML = `
            <div class="post-gallery-image-frame">
                <img
                    class="post-gallery-image"
                    alt="Thread attachment preview"
                    loading="lazy"
                >
            </div>
            <div class="post-gallery-count"></div>
        `;

        const image = gallery.querySelector(".post-gallery-image");
        const count = gallery.querySelector(".post-gallery-count");
        image.src = attachments[0].image_url;
        count.textContent = attachments.length > 1 ? `${attachments.length} images` : "";
        count.hidden = attachments.length < 2;

        image.addEventListener("click", () => openAttachmentImage(attachments[0].image_url));

        return gallery;
    }

    function addMessageToView(msg) {
        const messagesDiv = pageContainer.querySelector("#messages");
        if (!messagesDiv) return;

        messagesDiv.appendChild(createMessageElement(msg));
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        updateTimestamps();
    }

    async function openPinsPanel(threadId) {
        pinsPanel?.classList.remove("hidden");

        if (!pinsList) return;

        const pins = await safeFetch(resolvedApi.threadPins(threadId));
        pinsList.innerHTML = "";

        if (!Array.isArray(pins) || !pins.length) {
            pinsList.innerHTML = `
                <div class="empty-pins">
                    NO PINNED MESSAGES
                </div>
            `;
            return;
        }

        pins.forEach(pin => {
            const div = document.createElement("div");
            div.className = "pin-entry";
            div.innerHTML = `
                <div class="pin-top">
                    <div class="pin-user"></div>
                    ${isAdmin ? `
                        <button
                            class="pin-remove-btn"
                            data-id="${pin.message_id}">
                            UNPIN
                        </button>
                    ` : ""}
                </div>
                <div class="pin-content"></div>
            `;

            div.querySelector(".pin-user").textContent = pin.username;
            div.querySelector(".pin-content").textContent = pin.content;
            pinsList.appendChild(div);
        });
    }

    let imageModal = null;

    function initImageModal() {
        imageModal = document.createElement("div");
        imageModal.className = "image-modal";
        imageModal.innerHTML = `
            <div class="image-modal-content">
                <img
                    class="image-modal-image"
                    src=""
                    alt="Expanded image"
                >
                <button
                    class="image-modal-close"
                    aria-label="Close image">
                    X
                </button>
            </div>
        `;

        document.body.appendChild(imageModal);
        imageModal.querySelector(".image-modal-close").addEventListener("click", closeImageModal);

        imageModal.addEventListener("click", (e) => {
            if (e.target === imageModal) closeImageModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && imageModal.classList.contains("active")) {
                closeImageModal();
            }
        });
    }

    function openImageModal(src) {
        if (!imageModal) initImageModal();

        imageModal.querySelector(".image-modal-image").src = src;
        imageModal.classList.add("active");
    }

    function closeImageModal() {
        imageModal?.classList.remove("active");
    }

    window.openImageModal = openImageModal;
    window.closeImageModal = closeImageModal;

    function updateJoinedThreadsList() {
        if (!joinedThreadsList) return;

        joinedThreadsList.innerHTML = "";

        allThreads.forEach(thread => {
            const item = document.createElement("div");
            item.className = "thread-item thread";

            if (currentThread === thread.id) item.classList.add("active");
            if (thread.is_pinned) item.classList.add("pinned-thread");

            const threadTitle =
                thread.title.length > 22
                    ? `${thread.title.slice(0, 22)}...`
                    : thread.title;

            item.textContent = `${thread.is_locked ? "[LOCKED] " : ""}# ${threadTitle}`;
            item.addEventListener("click", () => switchToThread(thread.id, thread));
            joinedThreadsList.appendChild(item);
        });
    }

    function updateOnlineUsers() {
        if (!onlineUsers) return;

        onlineUsers.innerHTML = "";

        onlineUsersList.forEach(user => {
            const item = document.createElement("div");
            item.className = "user-item online";
            item.textContent = user.username || user;
            onlineUsers.appendChild(item);
        });
    }

    function closeAllMenus() {
        document.querySelectorAll(".message-menu")
            .forEach(menu => menu.classList.add("hidden"));

        document.querySelectorAll(".menu-open")
            .forEach(item => item.classList.remove("menu-open"));
    }

    function updatePinnedMessageState(messageId, pinned) {
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!message) return;

        message.classList.toggle("pinned", pinned);

        const existing = message.querySelector(".message-pinned-badge");

        if (pinned && !existing) {
            message.querySelector(".message-user")?.appendChild(createPinnedBadge());
        }

        if (!pinned) existing?.remove();

        const action = message.querySelector(".pin-btn, .unpin-btn");

        if (action) {
            action.classList.toggle("pin-btn", !pinned);
            action.classList.toggle("unpin-btn", pinned);
            action.textContent = pinned ? "UNPIN" : "PIN";
        }
    }

    function applyThreadUpdate(threadId, changes) {
        const id = Number(threadId);
        if (!id) return;

        const thread = allThreads.find(t => t.id === id);
        if (!thread) return;

        Object.assign(thread, changes);

        if (Object.prototype.hasOwnProperty.call(changes, "is_pinned")) {
            allThreads.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
        }

        const card = pageContainer.querySelector(`.post-card[data-thread-id="${id}"]`);
        if (card) {
            card.classList.toggle("pinned-thread", thread.is_pinned);
            card.classList.toggle("locked-thread", thread.is_locked);

            const pinBtn = card.querySelector(".thread-pin-btn");
            if (pinBtn) {
                pinBtn.textContent = thread.is_pinned ? "UNPIN THREAD" : "PIN THREAD";
            }

            const lockBtn = card.querySelector(".thread-lock-btn");
            if (lockBtn) {
                lockBtn.textContent = thread.is_locked ? "UNLOCK THREAD" : "LOCK THREAD";
            }

            const statusContainer = card.querySelector(".post-card-main");
            statusContainer.querySelector(".status-badges")?.remove();
            const badges = createStatusBadges(thread);
            if (badges.children.length) {
                statusContainer.prepend(badges);
            }
        }

        updateJoinedThreadsList();

        if (document.querySelector("#threadsFeed")) {
            renderFeed(allThreads);
        }

        if (currentThread === id) {
            currentThreadData = {
                ...currentThreadData,
                ...changes
            };
            renderThreadHeaderState(currentThreadData);
        }
    }

    function removeThreadAttachment(messageId, attachmentId) {
        const message = pageContainer.querySelector(`[data-message-id="${messageId}"]`);
        if (!message) return;

        const frame = message.querySelector(`.message-image-frame[data-attachment-id="${attachmentId}"]`);
        if (!frame) return;

        frame.remove();

        if (!message.querySelector(".message-image-frame")) {
            message.querySelector(".message-gallery")?.remove();
        }
    }

    function attachAdminDelegates() {
        if (!isAdmin) return;

        document.addEventListener("click", async (e) => {
            const menuBtn = e.target.closest(".message-menu-btn");

            if (menuBtn) {
                const owner =
                    menuBtn.closest(".message") ||
                    menuBtn.closest(".post-card");
                const menu = owner?.querySelector(".message-menu");

                if (!menu) return;

                const isOpen = !menu.classList.contains("hidden");
                closeAllMenus();

                if (!isOpen) {
                    owner.classList.add("menu-open");
                    menu.classList.remove("hidden");
                }

                e.stopPropagation();
                return;
            }

            const threadPinBtn = e.target.closest(".thread-pin-btn");
            if (threadPinBtn) {
                await adminHandlers.onToggleThreadPin?.(threadPinBtn.dataset.id);
                closeAllMenus();
                return;
            }

            const threadLockBtn = e.target.closest(".thread-lock-btn");
            if (threadLockBtn) {
                await adminHandlers.onToggleThreadLock?.(threadLockBtn.dataset.id);
                closeAllMenus();
                return;
            }

            const deleteThreadBtn = e.target.closest(".delete-thread-btn");
            if (deleteThreadBtn) {
                await adminHandlers.onDeleteThread?.(deleteThreadBtn.dataset.id);
                closeAllMenus();
                return;
            }

            const deleteBtn = e.target.closest(".delete-btn");
            if (deleteBtn) {
                await adminHandlers.onDeleteMessage?.(deleteBtn.dataset.id);
                closeAllMenus();
                return;
            }

            const pinBtn = e.target.closest(".pin-btn");
            if (pinBtn) {
                await adminHandlers.onPinMessage?.(pinBtn.dataset.id);
                closeAllMenus();
                return;
            }

            const unpinBtn = e.target.closest(".unpin-btn");
            if (unpinBtn) {
                await adminHandlers.onUnpinMessage?.(unpinBtn.dataset.id);
                closeAllMenus();
                return;
            }

            const inspectBtn = e.target.closest(".inspect-btn");
            if (inspectBtn) {
                await adminHandlers.onInspect?.(inspectBtn.dataset.user);
                closeAllMenus();
                return;
            }

            const imageDeleteBtn = e.target.closest(".image-delete-btn");
            if (imageDeleteBtn) {
                await adminHandlers.onDeleteAttachment?.(imageDeleteBtn.dataset.attachmentId);
                return;
            }

            const pinRemoveBtn = e.target.closest(".pin-remove-btn");
            if (pinRemoveBtn) {
                await adminHandlers.onUnpinMessage?.(pinRemoveBtn.dataset.id);
                await openPinsPanel(currentThread);
                return;
            }

            if (!e.target.closest(".message-menu")) {
                closeAllMenus();
            }
        });
    }

    socket.on("connect", () => {
        console.log("Thread socket connected");
        socket.emit("user:online", {
            username: currentUsername,
            userId: currentUserId
        });
    });

    socket.on("thread:message:new", (message) => {
        if (currentThread === message.thread_id) {
            addMessageToView(message);
        }
    });

    socket.on("thread:message:delete", (messageId) => {
        document.querySelector(`[data-message-id="${messageId}"]`)?.remove();
    });

    socket.on("thread:message:pin", (payload) => {
        updatePinnedMessageState(payload?.messageId, true);
    });

    socket.on("thread:message:unpin", (payload) => {
        updatePinnedMessageState(payload?.messageId, false);
    });

    socket.on("thread:updated", (payload) => {
        if (!payload?.threadId) return;

        const changes = {};
        if (Object.prototype.hasOwnProperty.call(payload, "is_pinned")) {
            changes.is_pinned = payload.is_pinned;
        }
        if (Object.prototype.hasOwnProperty.call(payload, "is_locked")) {
            changes.is_locked = payload.is_locked;
        }

        if (Object.keys(changes).length) {
            applyThreadUpdate(payload.threadId, changes);
        }
    });

    socket.on("threads:deleted", (payload) => {
        const id = Number(payload?.threadId);
        if (!id) return;

        allThreads = allThreads.filter(thread => thread.id !== id);
        updateJoinedThreadsList();

        const card = pageContainer.querySelector(`.post-card[data-thread-id="${id}"]`);
        card?.remove();

        if (currentThread === id) {
            switchToFeed();
        }
    });

    socket.on("thread:attachment:deleted", (payload) => {
        if (!payload?.messageId || !payload?.attachmentId) return;
        removeThreadAttachment(payload.messageId, payload.attachmentId);
    });

    socket.on("threads:new", (payload) => {
        const thread = payload.thread || payload;
        allThreads.unshift(thread);
        allThreads.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
        updateJoinedThreadsList();

        if (document.querySelector("#threadsFeed")) {
            const feed = pageContainer.querySelector("#threadsFeed");
            feed.prepend(createThreadCard(thread));
        }
    });

    socket.on("user:joined", (userData) => {
        onlineUsersList = userData.onlineUsers || [];
        updateOnlineUsers();
    });

    socket.on("user:left", (userData) => {
        onlineUsersList = userData.onlineUsers || [];
        updateOnlineUsers();
    });

    threadsFeedCard?.addEventListener("click", () => {
        switchToFeed();
    });

    attachAdminDelegates();
    switchToFeed();

    return {
        loadThreads,
        switchToFeed,
        switchToThread,
        getCurrentThread: () => currentThreadData,
        getCurrentThreadId: () => currentThread,
        getMessageContent: (messageId) =>
            document
                .querySelector(`[data-message-id="${messageId}"] .message-content`)
                ?.textContent || "",
        getMessageUsername: (messageId) =>
            document
                .querySelector(`[data-message-id="${messageId}"] .message-user span`)
                ?.textContent
                ?.trim() || "",
        reloadCurrentThread: async () => {
            if (currentThread && currentThreadData) {
                await loadThreadMessages(currentThread, currentThreadData);
            }
        },
        clearAttachments: () => {
            selectedFiles = [];
            renderAttachmentPreview();
        }
    };
}
