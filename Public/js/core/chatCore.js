/* =========================
CORE CHAT ENGINE (SHARED)
========================= */

export function createChatCore(config) {


    const {
        elements,
        api,
        isAdmin = false,
        adminHandlers = {}
    } = config;

    const {
        chatTitle,
        messagesDiv,
        messageForm,
        messageInput,
        imageInput,
        globalChat,
        usersList,
        roomsList,
        inviteUserBtn
    } = elements;

    let currentChat = {
        type: "global",
        id: null,
        name: "Global Chat"
    };

    const socket = io();

    const attachBtn =
        document.getElementById(
            "attachBtn"
        );

    const attachmentPreview =
        document.getElementById(
            "attachmentPreview"
        );

    let selectedFiles = [];

    socket.emit("join:global");

    /* =========================
    TIME SYSTEM
    ========================= */

    function getRelativeTime(timestamp) {

        if (!timestamp) return "";

        const now = Date.now();

        const time =
            new Date(timestamp).getTime();

        const diff =
            Math.floor((now - time) / 1000);

        if (diff < 10)
            return "just now";

        if (diff < 60)
            return `${diff}s ago`;

        const minutes =
            Math.floor(diff / 60);

        if (minutes < 60)
            return `${minutes}m ago`;

        const hours =
            Math.floor(minutes / 60);

        if (hours < 24)
            return `${hours}h ago`;

        return `${Math.floor(hours / 24)}d ago`;
    }

    function updateTimestamps() {

        document
            .querySelectorAll(".timestamp")
            .forEach(el => {

                const time =
                    el.getAttribute(
                        "data-time"
                    );

                el.textContent =
                    ` // ${getRelativeTime(time)}`;
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
                await fetch(url, {

                    credentials:
                        "include",

                    ...options
                });

            if (!res.ok)
                return null;

            return await res.json();

        } catch (err) {

            console.log(err);

            return null;
        }
    }

    /* =========================
    CREATE MESSAGE NODE
    ========================= */

    function createMessageElement(msg) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "message";

        wrapper.dataset.messageId =
            msg.id;

        if (msg.pinned) {
            wrapper.classList.add(
                "pinned"
            );
        }

        /* =========================
        USER
        ========================= */

        const userDiv =
            document.createElement("div");

        userDiv.className =
            "message-user";

        const usernameText =
            document.createElement("span");

        usernameText.textContent =
            msg.username;

        userDiv.appendChild(
            usernameText
        );

        /* =========================
        TIMESTAMP
        ========================= */

        const timestamp =
            document.createElement("span");

        timestamp.className =
            "timestamp";

        timestamp.setAttribute(
            "data-time",
            msg.created_at
        );

        timestamp.textContent =
            ` // ${getRelativeTime(msg.created_at)}`;

        userDiv.appendChild(
            timestamp
        );

        /* =========================
        PIN BADGE
        ========================= */

        if (msg.pinned) {

            const badge =
                document.createElement("span");

            badge.className =
                "message-pinned-badge";

            badge.textContent =
                "PINNED";

            userDiv.appendChild(
                badge
            );
        }

        /* =========================
        CONTENT
        ========================= */

        const contentDiv =
            document.createElement("div");

        contentDiv.className =
            "message-content";

        contentDiv.textContent =
            msg.content ||
            msg.message;

        wrapper.appendChild(
            userDiv
        );

        wrapper.appendChild(
            contentDiv
        );

        if (
            msg.attachments &&
            msg.attachments.length
        ) {

            const gallery =
                document.createElement(
                    "div"
                );

            gallery.className =
                "message-gallery";

            msg.attachments.forEach(
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
                        () => {

                            if (
                                window.openImageModal
                            ) {

                                window.openImageModal(
                                    attachment.image_url
                                );

                            } else {

                                window.open(
                                    attachment.image_url,
                                    "_blank"
                                );
                            }
                        }
                    );

                    gallery.appendChild(
                        img
                    );
                }
            );

            wrapper.appendChild(
                gallery
            );
        }

        /* =========================
        ADMIN MENU
        ========================= */

        if (isAdmin) {

            const moderation =
                document.createElement("div");

            moderation.className =
                "message-moderation";

            moderation.innerHTML = `

                <button
                    class="message-menu-btn">
                    ⚙
                </button>

                <div class="message-menu hidden">

                    <button
                        class="menu-action delete-btn"
                        data-id="${msg.id}">
                        DELETE
                    </button>

                    <button
                        class="menu-action ${
                msg.pinned
                    ? "unpin-btn"
                    : "pin-btn"
            }"
                        data-id="${msg.id}">
                        ${
                msg.pinned
                    ? "UNPIN"
                    : "PIN"
            }
                    </button>

                    <button
                        class="menu-action inspect-btn"
                        data-user="${msg.user_id}">
                        INSPECT
                    </button>

                </div>
            `;

            wrapper.appendChild(
                moderation
            );
        }

        return wrapper;
    }

    /* =========================
    RENDER MESSAGES
    ========================= */

    function renderMessages(data) {

        messagesDiv.innerHTML = "";

        data.forEach(msg => {

            const element =
                createMessageElement(msg);

            messagesDiv.appendChild(
                element
            );
        });

        messagesDiv.scrollTop =
            messagesDiv.scrollHeight;

        updateTimestamps();
    }

    function setActiveChannel(element) {

        document
            .querySelectorAll(
                ".channel-item"
            )
            .forEach(item => {

                item.classList.remove(
                    "active"
                );
            });

        element?.classList.add(
            "active"
        );
    }

    /* =========================
    SOCKET EVENTS
    ========================= */

    socket.on(
        "global:message:new",
        (msg) => {

            if (currentChat.type !== "global") {
                return;
            }

            const exists =
                document.querySelector(
                    `[data-message-id="${msg.id}"]`
                );

            if (exists) return;

            const element =
                createMessageElement(msg);

            messagesDiv.appendChild(
                element
            );

            messagesDiv.scrollTop =
                messagesDiv.scrollHeight;
        }
    );

    socket.on(
        "room:message:new",
        (msg) => {

            if (
                currentChat.type !== "room" ||
                String(currentChat.id) !== String(msg.room_id)
            ) {
                return;
            }

            const exists =
                document.querySelector(
                    `[data-message-id="${msg.id}"]`
                );

            if (exists) return;

            const element =
                createMessageElement(msg);

            messagesDiv.appendChild(
                element
            );

            messagesDiv.scrollTop =
                messagesDiv.scrollHeight;
        }
    );

    socket.on(
        "dm:message:new",
        (msg) => {

            if (
                currentChat.type !== "dm" ||
                currentChat.roomId !== msg.roomId
            ) {
                return;
            }

            const exists =
                document.querySelector(
                    `[data-message-id="${msg.id}"]`
                );

            if (exists) return;

            const element =
                createMessageElement(msg);

            messagesDiv.appendChild(
                element
            );

            messagesDiv.scrollTop =
                messagesDiv.scrollHeight;
        }
    );

    socket.on(
        "message:delete",
        (id) => {

            document
                .querySelector(
                    `[data-message-id="${id}"]`
                )
                ?.remove();
        }
    );

    socket.on(
        "message:pin",
        (messageId) => {

            const message =
                document.querySelector(
                    `[data-message-id="${messageId}"]`
                );

            if (!message) return;

            message.classList.add(
                "pinned"
            );

            if (
                !message.querySelector(
                    ".message-pinned-badge"
                )
            ) {

                const badge =
                    document.createElement(
                        "span"
                    );

                badge.className =
                    "message-pinned-badge";

                badge.textContent =
                    "PINNED";

                message
                    .querySelector(
                        ".message-user"
                    )
                    ?.appendChild(
                        badge
                    );
            }

            const pinBtn =
                message.querySelector(
                    ".pin-btn"
                );

            if (pinBtn) {

                pinBtn.classList.remove(
                    "pin-btn"
                );

                pinBtn.classList.add(
                    "unpin-btn"
                );

                pinBtn.textContent =
                    "UNPIN";
            }
        }
    );

    socket.on(
        "message:unpin",
        (messageId) => {

            const message =
                document.querySelector(
                    `[data-message-id="${messageId}"]`
                );

            if (!message) return;

            message.classList.remove(
                "pinned"
            );

            message
                .querySelector(
                    ".message-pinned-badge"
                )
                ?.remove();

            const unpinBtn =
                message.querySelector(
                    ".unpin-btn"
                );

            if (unpinBtn) {

                unpinBtn.classList.remove(
                    "unpin-btn"
                );

                unpinBtn.classList.add(
                    "pin-btn"
                );

                unpinBtn.textContent =
                    "PIN";
            }
        }
    );

    /* =========================
    ADMIN EVENTS
    ========================= */

    if (isAdmin) {

        messagesDiv.addEventListener(
            "click",
            async (e) => {

                const menuBtn =
                    e.target.closest(
                        ".message-menu-btn"
                    );

                if (menuBtn) {

                    const message =
                        menuBtn.closest(
                            ".message"
                        );

                    const menu =
                        message.querySelector(
                            ".message-menu"
                        );

                    const isOpen =
                        !menu.classList.contains(
                            "hidden"
                        );

                    document
                        .querySelectorAll(
                            ".message-menu"
                        )
                        .forEach(m =>
                            m.classList.add(
                                "hidden"
                            )
                        );

                    if (!isOpen) {

                        menu.classList.remove(
                            "hidden"
                        );
                    }

                    return;
                }

                const deleteBtn =
                    e.target.closest(
                        ".delete-btn"
                    );

                if (deleteBtn) {

                    adminHandlers.onDelete?.(
                        deleteBtn.dataset.id
                    );

                    return;
                }

                const pinBtn =
                    e.target.closest(
                        ".pin-btn"
                    );

                if (pinBtn) {

                    adminHandlers.onPin?.(
                        pinBtn.dataset.id
                    );

                    return;
                }

                const unpinBtn =
                    e.target.closest(
                        ".unpin-btn"
                    );

                if (unpinBtn) {

                    adminHandlers.onUnpin?.(
                        unpinBtn.dataset.id
                    );

                    return;
                }

                const inspectBtn =
                    e.target.closest(
                        ".inspect-btn"
                    );

                if (inspectBtn) {

                    adminHandlers.onInspect?.(
                        inspectBtn.dataset.user
                    );

                    return;
                }
            }
        );
    }

    /* =========================
    LOAD
    ========================= */

    async function loadMessages(url) {

        const data =
            await safeFetch(url);

        if (!data) return;

        renderMessages(data);
    }

    /* =========================
    SWITCH CHAT
    ========================= */

    async function switchChat(chatData) {

        if (inviteUserBtn) {

            if (chatData.type === "room") {

                inviteUserBtn.classList.remove(
                    "hidden"
                );

            } else {

                inviteUserBtn.classList.add(
                    "hidden"
                );
            }
        }

        currentChat = {
            ...chatData,
            target:
                chatData.type === "global"
                    ? null
                    : `${chatData.id}`
        };

        chatTitle.textContent =
            chatData.name;

        if (chatData.type === "global") {

            socket.emit("join:global");

            setActiveChannel(globalChat);

            await loadMessages(
                api.global
            );

            return;
        }

        if (chatData.type === "room") {

            socket.emit(
                "join:room",
                chatData.id
            );

            setActiveChannel(
                chatData.element ||
                document.querySelector(
                    `.channel-item.room[data-chat-id="${chatData.id}"]`
                )
            );

            await loadMessages(
                api.roomMessages(
                    chatData.id
                )
            );

            return;
        }

        if (chatData.type === "dm") {

            const dmRoom =
                chatData.roomId || [
                    chatData.id,
                    window.currentUserId
                ]
                    .sort()
                    .join("-");

            socket.emit(
                "join:dm",
                dmRoom
            );

            currentChat.roomId = dmRoom;

            setActiveChannel(
                chatData.element ||
                document.querySelector(
                    `.channel-item.user[data-chat-id="${chatData.id}"]`
                )
            );

            await loadMessages(
                api.dmMessages(
                    chatData.id
                )
            );
        }
    }

    /* =========================
    LOAD ROOMS
    ========================= */

    async function loadRooms() {

        if (!roomsList) return;

        const rooms =
            await safeFetch(
                api.rooms
            );

        if (!rooms) return;

        roomsList.innerHTML = "";

        rooms.forEach(room => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "channel-item room";

            div.dataset.chatId =
                room.id;

            div.textContent =
                `# ${room.name}`;

            div.addEventListener(
                "click",
                () => {

                    switchChat({

                        type: "room",

                        id: room.id,

                        name:
                            `# ${room.name}`,

                        element: div
                    });
                }
            );

            roomsList.appendChild(
                div
            );
        });

        if (
            currentChat.type === "room"
        ) {
            setActiveChannel(
                roomsList.querySelector(
                    `[data-chat-id="${currentChat.id}"]`
                )
            );
        }
    }

    /* =========================
    LOAD DMS
    ========================= */

    async function loadDMs() {

        if (!usersList) return;

        const dms =
            await safeFetch(
                api.dms
            );

        if (!dms) return;

        usersList.innerHTML = "";

        dms.forEach(dm => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "channel-item user";

            div.dataset.chatId =
                dm.id;

            div.textContent =
                `@ ${dm.username}`;

            div.addEventListener(
                "click",
                () => {

                    switchChat({

                        type: "dm",

                        id: dm.id,

                        name:
                            `@ ${dm.username}`,

                        element: div
                    });
                }
            );

            usersList.appendChild(
                div
            );
        });

        if (
            currentChat.type === "dm"
        ) {
            setActiveChannel(
                usersList.querySelector(
                    `[data-chat-id="${currentChat.id}"]`
                )
            );
        }
    }

    /* =========================
    GLOBAL
    ========================= */

    globalChat?.addEventListener(
        "click",
        () => {

            switchChat({

                type: "global",
                id: null,
                name: "# Global Chat"
            });

            setActiveChannel(globalChat);
        }
    );

    /* =========================
FILE PICKER
========================= */

    attachBtn?.addEventListener(
        "click",
        () => {

            imageInput?.click();
        }
    );

    /* =========================
    FILE SELECT
    ========================= */

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

    /* =========================
    RENDER ATTACHMENTS
    ========================= */

    function renderAttachmentPreview() {

        if (!attachmentPreview) {
            return;
        }

        attachmentPreview.innerHTML = "";

        if (!selectedFiles.length) {

            attachmentPreview.classList.add(
                "hidden"
            );

            return;
        }

        attachmentPreview.classList.remove(
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
                        >

                        <button
                            type="button"
                            class="remove-attachment"
                            data-index="${index}">
                            ×
                        </button>
                    `;

                        attachmentPreview.appendChild(
                            item
                        );
                    };

                reader.readAsDataURL(
                    file
                );
            }
        );
    }

    /* =========================
    REMOVE ATTACHMENT
    ========================= */

    attachmentPreview?.addEventListener(
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
    SEND
    ========================= */

    messageForm?.addEventListener(
        "submit",

        async (e) => {

            e.preventDefault();

            const text =
                messageInput.value.trim();

            const files = selectedFiles;

            /* =========================
               PREVENT EMPTY MESSAGE
            ========================= */

            if (
                !text &&
                !files.length
            ) {

                return;
            }

            let url = null;

            if (
                currentChat.type ===
                "global"
            ) {

                url =
                    api.sendGlobal;
            }

            if (
                currentChat.type ===
                "room"
            ) {

                url =
                    api.sendRoom(
                        currentChat.id
                    );
            }

            if (
                currentChat.type ===
                "dm"
            ) {

                url =
                    api.sendDm(
                        currentChat.id
                    );
            }

            if (!url) return;

            const formData =
                new FormData();

            formData.append(
                "content",
                text
            );

            for (
                const file
                of files
                ) {

                formData.append(
                    "images",
                    file
                );
            }

            const result =
                await safeFetch(
                    url,
                    {

                        method: "POST",

                        body: formData
                    }
                );

            if (!result) {
                return;
            }

            messageInput.value = "";

            selectedFiles = [];

            renderAttachmentPreview();

            if (imageInput) {

                imageInput.value = "";
            }
        }
    );

    /* =========================
    INIT
    ========================= */

    switchChat({

        type: "global",
        id: null,
        name: "# Global Chat"
    });

    loadRooms();

    loadDMs();

    return {

        renderMessages,

        loadMessages,

        loadRooms,

        loadDMs,

        switchChat,

        getCurrentChat: () =>
            currentChat
    };
}