export function createThreadsCore(config) {

    const {
        elements,
        api,
        currentUserId,
        currentUsername
    } = config;

    const {
        joinedThreadsList,
        onlineUsers,

        pinsBtn,
        pinsPanel,
        closePins,
        pinsList,

        attachmentPreview
    } = elements;

    const socket = io();
    const pageContainer = document.querySelector(".threads-container");
    const threadsFeedCard = document.getElementById("threadsFeedCard");


    let currentThread = null;
    let allThreads = [];
    let onlineUsersList = [];

    let selectedFiles = [];
    let activeAttachmentPreview = attachmentPreview;

    /* =========================
       RELATIVE TIME SYSTEM
    ========================= */

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
        pageContainer.querySelectorAll(".timestamp")
            .forEach(el => {
                const time = el.getAttribute("data-time");
                el.textContent = ` // ${getRelativeTime(time)}`;
            });
    }

    setInterval(updateTimestamps, 60000);

    /* =========================
       SAFE FETCH
    ========================= */

    async function safeFetch(
        url,
        options = {}
    ) {

        try {

            const res =
                await fetch(
                    url,
                    {
                        credentials:
                            "include",

                        ...options
                    }
                );

            if (!res.ok)
                return null;

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
                api.threadMessages || ((threadId) => `/threads/api/${threadId}/messages`),
            sendThreadMessage:
                api.sendThreadMessage || ((threadId) => `/threads/api/${threadId}/send`),
            threadAttachments:
                api.threadAttachments || ((threadId) => `/threads/api/${threadId}/attachments`),
            deleteThread:
                api.deleteThread || ((threadId) => `/threads/api/admin/thread/${threadId}`)

        };

        return {
            ...api,
            ...defaultApi
        };
    }

    const resolvedApi = buildApiPaths();

    /* =========================
       LOAD FEED
    ========================= */

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

        renderAttachmentPreview();

        submitBtn?.addEventListener("click", async () => {
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();

            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);
            selectedFiles.forEach(file => {
                formData.append("images", file);
            });

            if (!title || !content) return;

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

        threadImageInput?.addEventListener(
            "change",
            (e) => {

                const files =
                    Array.from(
                        e.target.files
                    );

                if (!files.length) {
                    return;
                }

                selectedFiles = [
                    ...selectedFiles,
                    ...files
                ];

                renderAttachmentPreview();

                threadImageInput.value = "";
            }
        );

        activeAttachmentPreview?.addEventListener(
            "click",
            (e) => {

                const removeBtn =
                    e.target.closest(
                        ".remove-attachment"
                    );

                if (!removeBtn) {
                    return;
                }

                const index =
                    Number(
                        removeBtn.dataset.index
                    );

                selectedFiles.splice(
                    index,
                    1
                );

                renderAttachmentPreview();
            }
        );


    }

    function createThreadCard(thread) {
        const div = document.createElement("div");
        div.className = "post-card";

        const time = thread.created_at;

        div.innerHTML = `
            <div class="post-card-body">
                <div class="post-card-main">
                    <div class="post-title">${thread.title}</div>
                    <div class="post-content">${thread.content}</div>
                    <div class="post-meta">
                        <span class="post-author">${thread.username}</span>
                        <span class="timestamp" data-time="${time}">
                            // ${getRelativeTime(time)}
                        </span>
                    </div>
                </div>
                <div class="post-gallery-slot"></div>
            </div>
        `;

        const attachments = getImageAttachments(thread);
        const gallerySlot = div.querySelector(".post-gallery-slot");

        if (attachments.length) {
            gallerySlot.appendChild(
                createPostGalleryPreview(attachments)
            );
        }

        div.addEventListener("click", () => switchToThread(thread.id, thread));

        return div;
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

    /* =========================
       LOAD THREAD ROOM
    ========================= */

    function switchToThread(threadId, threadData) {
        const roomTemplate = document.getElementById("threadRoomTemplate");
        pageContainer.innerHTML = roomTemplate.innerHTML;
        currentThread = threadId;
        activeAttachmentPreview =
            pageContainer.querySelector("#attachmentPreview") ||
            attachmentPreview;
        selectedFiles = [];

        socket.emit("join:thread", threadId);
        setupThreadListeners(threadId, threadData);
        loadThreadMessages(threadId, threadData);

        const chatTitle = pageContainer.querySelector("#chatTitle");
        if (chatTitle && threadData) {
            chatTitle.innerHTML = `# ${threadData.title}`;
        }
    }

    function setupThreadListeners(threadId, threadData) {
        const messageForm = pageContainer.querySelector("#messageForm");
        const messageInput = pageContainer.querySelector("#messageInput");
        const attachBtn = pageContainer.querySelector("#attachBtn");
        const imageInput = pageContainer.querySelector("#imageInput");
        const backBtn = pageContainer.querySelector("#backBtn");
        const pinsBtn = pageContainer.querySelector("#pinsBtn");
        const closePins = pageContainer.querySelector("#closePins");

        renderAttachmentPreview();

        backBtn?.addEventListener("click", () => {
            switchToFeed();
        });

        attachBtn?.addEventListener("click", () => {
            imageInput?.click();
        });

        imageInput?.addEventListener(
            "change",
            (e) => {

                const files =
                    Array.from(
                        e.target.files
                    );

                if (!files.length) {
                    return;
                }

                selectedFiles = [
                    ...selectedFiles,
                    ...files
                ];

                renderAttachmentPreview();

                imageInput.value = "";
            }
        );

        messageForm?.addEventListener("submit", async (e) => {
            e.preventDefault();

            const content = messageInput.value.trim();

            if (!content && !selectedFiles.length) {
                return;
            }

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

        activeAttachmentPreview?.addEventListener(
            "click",
            (e) => {

                const removeBtn =
                    e.target.closest(
                        ".remove-attachment"
                    );

                if (!removeBtn) {
                    return;
                }

                const index =
                    Number(
                        removeBtn.dataset.index
                    );

                selectedFiles.splice(
                    index,
                    1
                );

                renderAttachmentPreview();
            }
        );

        /* =========================
        OPEN PINS
        ========================= */

        pinsBtn?.addEventListener(
            "click",
            async () => {

                pinsPanel?.classList.remove(
                    "hidden"
                );

                const current =
                    currentThread;


                const pins =
                    await fetchPins(
                        currentChat.type,
                        currentChat.target
                    );

                pinsList.innerHTML = "";

                if (!pins.length) {

                    pinsList.innerHTML = `
                <div class="empty-pins">
                    NO PINNED MESSAGES
                </div>
            `;

                    return;
                }

                pins.forEach(pin => {

                    const div =
                        document.createElement(
                            "div"
                        );

                    div.className =
                        "pin-entry";

                    div.innerHTML = `
                <div class="pin-top">

                    <div class="pin-user">
                        ${pin.username}
                    </div>

                </div>

                <div class="pin-content">
                    ${pin.content}
                </div>
            `;

                    pinsList?.appendChild(
                        div
                    );
                });
            }
        );

        /* =========================
        CLOSE PINS
        ========================= */

        closePins?.addEventListener(
            "click",
            () => {

                pinsPanel?.classList.add(
                    "hidden"
                );
            }
        );
    }

    /* =========================
    RENDER ATTACHMENTS
    ========================= */

    function renderAttachmentPreview() {

        if (!activeAttachmentPreview) {
            return;
        }

        activeAttachmentPreview.innerHTML = "";

        if (!selectedFiles.length) {

            activeAttachmentPreview.classList.add(
                "hidden"
            );

            return;
        }

        activeAttachmentPreview.classList.remove(
            "hidden"
        );

        selectedFiles.forEach(
            (file, index) => {

                const reader =
                    new FileReader();

                reader.onload =
                    (e) => {

                        const item =
                            document.createElement(
                                "div"
                            );

                        item.className =
                            "attachment-item";

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
                                ×
                            </button>
                        `;

                        const img = item.querySelector(".attachment-thumb");

                        img.addEventListener("click", () => {
                            if (window.openImageModal) {
                                window.openImageModal(e.target.result);
                            }
                        });

                        activeAttachmentPreview.appendChild(
                            item
                        );
                    };

                reader.readAsDataURL(
                    file
                );
            }
        );
    }

    async function loadThreadMessages(threadId, threadData) {
        const messages = await safeFetch(resolvedApi.threadMessages(threadId));

        if (!Array.isArray(messages)) return;

        const messagesDiv = pageContainer.querySelector("#messages");
        if (!messagesDiv) return;

        messagesDiv.innerHTML = "";

        // Thread starter message
        messagesDiv.appendChild(
            createMessageElement(threadData)
        )

        messages.forEach(msg => {
            messagesDiv.appendChild(createMessageElement(msg));
        });

        updateTimestamps();
    }

    function createMessageElement(msg) {
        const wrapper = document.createElement("div");
        wrapper.className = "message";
        wrapper.dataset.messageId = msg.id;

        const userDiv = document.createElement("div");
        userDiv.className = "message-user";

        const usernameText = document.createElement("span");
        usernameText.textContent = msg.username;
        userDiv.appendChild(usernameText);

        const timestamp = document.createElement("span");
        timestamp.className = "timestamp";
        timestamp.setAttribute("data-time", msg.created_at);
        timestamp.textContent = ` x// ${getRelativeTime(msg.created_at)}`;
        userDiv.appendChild(timestamp);

        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        contentDiv.textContent = msg.content;

        wrapper.appendChild(userDiv);
        wrapper.appendChild(contentDiv);

        const attachments = getImageAttachments(msg);

        if (attachments.length) {
            wrapper.appendChild(
                createMessageGallery(attachments)
            );
        }

        return wrapper;
    }

    function getImageAttachments(item) {
        if (!Array.isArray(item?.attachments)) {
            return [];
        }

        return item.attachments.filter(
            attachment => attachment?.image_url
        );
    }

    function openAttachmentImage(imageUrl) {
        if (window.openImageModal) {
            window.openImageModal(imageUrl);
            return;
        }

        window.open(
            imageUrl,
            "_blank"
        );
    }

    function createMessageGallery(attachments) {
        const gallery =
            document.createElement(
                "div"
            );

        gallery.className =
            "message-gallery";

        attachments.forEach(
            attachment => {

                const img =
                    document.createElement(
                        "img"
                    );

                img.src =
                    attachment.image_url;

                img.className =
                    "message-image";

                img.loading =
                    "lazy";

                img.style.cursor =
                    "pointer";

                img.addEventListener(
                    "click",
                    () => openAttachmentImage(
                        attachment.image_url
                    )
                );

                gallery.appendChild(
                    img
                );
            }
        );

        return gallery;
    }

    function createPostGalleryPreview(attachments) {
        const gallery =
            document.createElement(
                "div"
            );

        gallery.className =
            "post-gallery-preview";

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

        const image =
            gallery.querySelector(
                ".post-gallery-image"
            );

        const count =
            gallery.querySelector(
                ".post-gallery-count"
            );

        image.src =
            attachments[0].image_url;

        count.textContent =
            attachments.length > 1
                ? `${attachments.length} images`
                : "";

        count.hidden =
            attachments.length < 2;

        gallery.addEventListener(
            "click",
            (e) => {
                e.stopPropagation();
            }
        );

        image.addEventListener(
            "click",
            () => openAttachmentImage(
                attachments[0].image_url
            )
        );

        return gallery;
    }

    function addMessageToView(msg) {
        const messagesDiv = pageContainer.querySelector("#messages");
        if (!messagesDiv) return;

        messagesDiv.appendChild(createMessageElement(msg));
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        updateTimestamps();
    }

    /* =========================
IMAGE MODAL (LIGHTBOX)
========================= */

    let imageModal = null;

    function initImageModal() {

        imageModal =
            document.createElement("div");

        imageModal.className =
            "image-modal";

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
                ×
            </button>
        </div>
    `;

        document.body.appendChild(
            imageModal
        );

        const closeBtn =
            imageModal.querySelector(
                ".image-modal-close"
            );

        closeBtn.addEventListener(
            "click",
            closeImageModal
        );

        imageModal.addEventListener(
            "click",
            (e) => {

                if (
                    e.target === imageModal
                ) {

                    closeImageModal();
                }
            }
        );

        document.addEventListener(
            "keydown",
            (e) => {

                if (
                    e.key === "Escape" &&
                    imageModal.classList.contains(
                        "active"
                    )
                ) {

                    closeImageModal();
                }
            }
        );
    }

    function openImageModal(src) {

        if (!imageModal) {
            initImageModal();
        }

        const img =
            imageModal.querySelector(
                ".image-modal-image"
            );

        img.src = src;

        imageModal.classList.add(
            "active"
        );
    }

    function closeImageModal() {

        imageModal?.classList.remove(
            "active"
        );
    }

    /* Make modal accessible globally */
    window.openImageModal = openImageModal;
    window.closeImageModal = closeImageModal;

    /* =========================
       SIDEBAR - JOINED THREADS
    ========================= */

    function updateJoinedThreadsList() {
        if (!joinedThreadsList) return;

        joinedThreadsList.innerHTML = "";

        allThreads.forEach(thread => {
            const item = document.createElement("div");
            item.className = "thread-item thread    ";
            if (currentThread === thread.id) {
                item.classList.add("active");
            }

            const threadTitle = thread.title.length > 22 ? thread.title.slice(0, 22) + "..." : thread.title;

            item.textContent = `# ${threadTitle}`;
            item.addEventListener("click", () => switchToThread(thread.id, thread));

            joinedThreadsList.appendChild(item);
        });
    }

    /* =========================
       SIDEBAR - ONLINE USERS
    ========================= */

    function updateOnlineUsers() {
        if (!onlineUsers) return;

        onlineUsers.innerHTML = "";

        onlineUsersList.forEach(user => {
            const item = document.createElement("div");
            item.className = "user-item online";
            item.textContent = user.username;
            onlineUsers.appendChild(item);
        });
    }

    /* =========================
       SOCKET EVENTS
    ========================= */

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

    socket.on("threads:new", (thread) => {
        allThreads.unshift(thread);
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


    threadsFeedCard?.addEventListener(
        "click",
            () => {
            switchToFeed()
        })


    /* =========================
       INIT
    ========================= */

    switchToFeed();

    return {
        loadThreads,
        switchToFeed,
        switchToThread,

        clearAttachments: () => {
            selectedFiles = [];
            renderAttachmentPreview();
        }
    };
}
