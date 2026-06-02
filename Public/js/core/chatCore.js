/* =========================
CORE CHAT ENGINE (SHARED)
========================= */

export function createChatCore(config) {

    const {
        elements,
        api,
        isAdmin = false,
        adminHandlers = {},
        currentUserId
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

        inviteUserBtn,
        roomSettingsBtn,

        createRoomBtn,
        contactUserBtn,

        cyberModal,
        modalTitle,
        modalInput,
        confirmModalBtn,
        closeModalBtn,
        modalNote,

        roomSettingsPanel,
        settingsTitle,
        roomSettingsBody,
        roomSettingsFooter,
        closeSettingsBtn,

        pinsBtn,
        pinsPanel,
        closePins,
        pinsList,

        attachmentPreview
    } = elements;

    let currentChat = {
        type: "global",
        id: null,
        name: "Global Chat"
    };

    let adminOverrideChat = null;

    let activeModal = null;

    const modalConfigs = {
        createRoom: {
            title: "Create New Room",
            placeholder: "ENTER ROOM NAME",
            confirmText: "CREATE"
        },
        createDM: {
            title: "Contact User Privately",
            placeholder: "ENTER USERNAME",
            confirmText: "START CHAT"
        },
        inviteUser: {
            title: "Invite User To Room",
            placeholder: "ENTER USERNAME",
            confirmText: "INVITE"
        }
    };

    const socket = io();

    const attachBtn =
        document.getElementById(
            "attachBtn"
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

    function buildApiPaths() {
        const defaultApi = {
            createRoom:
                api.createRoom || (api.rooms ? `${api.rooms}/create` : undefined),
            startDm:
                api.startDm || (api.dms ? `${api.dms}/start` : undefined),
            roomInvite:
                api.roomInvite || (api.rooms ? ((roomId) => `${api.rooms}/${roomId}/invite`) : undefined),
            roomMembers:
                api.roomMembers || (api.rooms ? ((roomId) => `${api.rooms}/${roomId}/members`) : undefined),
            roomRemoveMember:
                api.roomRemoveMember || (api.rooms ? ((roomId, memberId) => `${api.rooms}/${roomId}/members/${memberId}`) : undefined),
            pins:
                api.pins || "/chat/api/pins"
        };

        return {
            ...api,
            ...defaultApi
        };
    }

    const resolvedApi = buildApiPaths();

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
    ROOM FUNCTIONS
    ========================= */

    async function createRoom(name) {
        if (!name || !name.trim() || !resolvedApi.createRoom) {
            return {
                success: false,
                message: "Room creation is not available"
            };
        }

        return safeFetch(resolvedApi.createRoom, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({name: name.trim()})
        });
    }

    async function inviteRoom(roomId, username) {
        if (!roomId || !username || !username.trim() || !resolvedApi.roomInvite) {
            return {
                success: false,
                message: "Room invite is not available"
            };
        }

        return safeFetch(resolvedApi.roomInvite(roomId), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({username: username.trim()})
        });
    }

    async function getRoomMembers(roomId) {
        if (!roomId || !resolvedApi.roomMembers) {
            return null;
        }

        return safeFetch(resolvedApi.roomMembers(roomId));
    }

    async function removeRoomMember(roomId, memberId) {
        if (!roomId || !memberId || !resolvedApi.roomRemoveMember) {
            return {
                success: false,
                message: "Room member removal is not available"
            };
        }

        return safeFetch(resolvedApi.roomRemoveMember(roomId, memberId), {
            method: "DELETE"
        });
    }

    async function fetchRoomMembers(roomId) {
        if (!roomId) {
            return null;
        }

        const result = await getRoomMembers(roomId);

        if (!result || !result.success) {
            const message = result?.message || 'Failed to load members';
            roomSettingsBody.innerHTML = `<div class="settings-message settings-error">${message}</div>`;
            roomSettingsFooter.innerHTML = "";
            return null;
        }

        return result.members || [];
    }

    async function handleRemoveRoomMember(memberId) {
        const current = currentChat;

        if (!current || current.type !== "room") {
            return;
        }

        const confirmation = window.confirm("Remove this member from the room?");
        if (!confirmation) {
            return;
        }

        const result = await removeRoomMember(current.id, memberId);

        if (!result || !result.success) {
            alert(result?.message || "Unable to remove member.");
            return;
        }

        await renderRoomSettings();
    }


    /* =========================
    DM FUNCTIONS
    ========================= */


    async function startDM(username) {
        if (!username || !username.trim() || !resolvedApi.startDm) {
            return {
                success: false,
                message: "Direct messaging is not available"
            };
        }

        return safeFetch(resolvedApi.startDm, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({username: username.trim()})
        });
    }

    /* =========================
    PINS FUNCTIONS
    ========================= */

    async function fetchPins(type, target) {
        const params = new URLSearchParams({
            type,
            target: target || ""
        });

        return safeFetch(`${resolvedApi.pins}?${params}`);
    }

    /* =========================
    MODAL
    ========================= */

    function openModal(action) {

        if (action === "roomSettings") {
            roomSettingsPanel?.classList.remove("hidden");
            activeModal = action;
            renderRoomSettings();
            return;
        }

        const config = modalConfigs[action];

        if (!config) {
            return;
        }

        modalTitle.textContent = config.title;
        modalInput.placeholder = config.placeholder;
        confirmModalBtn.textContent = config.confirmText;
        modalInput.value = "";

        cyberModal?.classList.remove("hidden");
        modalInput?.focus();
        activeModal = action;
    }

    function closeModal(action = null) {

        const modalToClose =
            action === "roomSettings"
                ? roomSettingsPanel
                : cyberModal;

        if (!modalToClose) {
            return;
        }

        modalToClose.classList.add("hidden");
        if (modalToClose === cyberModal) {
            modalInput.value = "";
        }

        modalNote?.classList.add(
            "hidden"
        );

        if (modalNote) {
            modalNote.innerHTML = "";
        }

        activeModal = null;
    }

    async function renderRoomSettings() {
        const current = currentChat

        if (!current || current.type !== "room") {
            roomSettingsBody.innerHTML = `<div class="settings-message">Room settings are only available for rooms.</div>`;
            roomSettingsFooter.innerHTML = "";
            return;
        }

        const roomName = current.name.replace(/^#\s*/, "");

        settingsTitle.textContent = `${roomName} Settings`;
        roomSettingsBody.innerHTML = `
        <div class="settings-section">
            <div class="settings-section-header">
                <div>
                    <h3>Members</h3>
                    <p class="settings-subtitle">Current members who can access this room.</p>
                </div>
                <span class="settings-count">Loading…</span>
            </div>
            <ul class="settings-members-list">
                <li class="settings-loading">Loading members...</li>
            </ul>
        </div>
    `;

        roomSettingsFooter.innerHTML = `<div class="settings-footer-note">You can remove room members here. Your own membership cannot be removed from this panel.</div>`;

        const members = await fetchRoomMembers(current.id);

        const list = roomSettingsBody.querySelector(".settings-members-list");
        const count = roomSettingsBody.querySelector(".settings-count");

        if (!members) {
            roomSettingsBody.innerHTML = `<div class="settings-message settings-error">Unable to load room members.</div>`;
            roomSettingsFooter.innerHTML = "";
            return;
        }

        if (count) {
            count.textContent = `${members.length} member${members.length === 1 ? "" : "s"}`;
        }

        if (!members.length) {
            list.innerHTML = `<li class="settings-empty">No members found for this room.</li>`;
            return;
        }

        list.innerHTML = members.map((member) => {
            const isCurrentUser = String(member.id) === String(window.currentUserId);
            return `
            <li class="settings-member-item">
                <div class="settings-member-meta">
                    <span class="settings-member-name">${member.username}</span>
                    ${isCurrentUser ? `<span class="settings-member-role">You</span>` : ""}
                </div>
                <button
                    class="settings-remove-btn"
                    data-member-id="${member.id}"
                    ${isCurrentUser ? "disabled" : ""}
                >
                    ${isCurrentUser ? "Current" : "REMOVE"}
                </button>
            </li>
        `;
        }).join("");
    }

    /* =========================
    HANDLE MODAL
    ========================= */

    async function processModalAction() {

        const value = modalInput.value.trim();

        if (!value || !activeModal) {
            return;
        }

        /* =========================
        CREATE ROOM
        ========================= */

        if (
            activeModal ===
            "createRoom"
        ) {

            const result =
                await createRoom(value);

            if (
                !result ||
                !result.success
            ) {

                alert(
                    result?.message ||
                    "Failed to create room"
                );

                return;
            }

            await loadRooms();

            await switchChat({

                type: "room",
                id: result.room.id,

                name:
                    `# ${result.room.name}`
            });

            closeModal();

            return;
        }

        /* =========================
        CREATE DM
        ========================= */

        if (
            activeModal ===
            "createDM"
        ) {

            const result =
                await startDM(value);

            if (
                !result ||
                !result.success
            ) {

                alert(
                    result?.message ||
                    "User not found"
                );

                return;
            }

            await loadDMs();

            await switchChat({
                type: "dm",
                id: result.id,

                roomId:
                result.roomId,

                name:
                    `@ ${result.username}`
            });

            closeModal();

            return;
        }

        /* =========================
        INVITE USER
        ========================= */

        if (
            activeModal ===
            "inviteUser"
        ) {

            const current =
                currentChat

            if (
                current.type !==
                "room"
            ) {
                return;
            }

            const result =
                await inviteRoom(
                    current.id,
                    value
                );

            if (
                !result ||
                !result.success
            ) {

                modalNote.innerHTML = `Failed to invite ${value} to the room.`;
                modalNote.classList.remove("hidden");

                return;
            }

            modalNote.innerHTML = `${value} has been invited to the room.`;
            modalNote.classList.remove("hidden");


        }
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

        if (roomSettingsBtn) {

            if (chatData.type === "room") {

                roomSettingsBtn.classList.remove(
                    "hidden"
                );

            } else {

                roomSettingsBtn.classList.add(
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

            console.log(currentChat);

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

            console.log(currentChat);

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

            console.log(currentChat);

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

                        name: `# ${room.name}`,

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

            if ((currentChat.type === "dm" || currentChat.type === "room") && result.message) {
                const element =
                    createMessageElement(result.message);
                messagesDiv.appendChild(element);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                updateTimestamps();
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
BUTTONS
========================= */

    createRoomBtn?.addEventListener(
        "click",
        () => openModal("createRoom")
    );

    contactUserBtn?.addEventListener(
        "click",
        () => openModal("createDM")
    );

    inviteUserBtn?.addEventListener(
        "click",
        () => {

            const current =
                currentChat;

            if (
                current.type !==
                "room"
            ) {
                return;
            }

            openModal(
                "inviteUser"
            );
        }
    );

    closeModalBtn?.addEventListener(
        "click",
        () => closeModal()
    );

    confirmModalBtn?.addEventListener(
        "click",
        processModalAction
    );

    cyberModal?.addEventListener(
        "click",
        (e) => {
            if (e.target === cyberModal) {
                closeModal();
            }
        }
    );

    roomSettingsBtn?.addEventListener(
        "click",
        () => openModal("roomSettings")
    );

    closeSettingsBtn?.addEventListener(
        "click",
        () => closeModal("roomSettings")
    );

    roomSettingsPanel?.addEventListener(
        "click",
        (e) => {
            if (e.target === roomSettingsPanel) {
                closeModal("roomSettings");
            }
        }
    );

    roomSettingsBody?.addEventListener(
        "click",
        (e) => {
            const removeBtn = e.target.closest(
                ".settings-remove-btn"
            );

            if (!removeBtn) {
                return;
            }

            const memberId = removeBtn.dataset.memberId;

            if (!memberId) {
                return;
            }

            handleRemoveRoomMember(Number(memberId));
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
                currentChat;


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
            adminOverrideChat || currentChat,

        reloadCurrentChat: async () => {
            await loadMessages(
                (() => {
                    if (currentChat.type === "global") return api.global;
                    if (currentChat.type === "room") return api.roomMessages(currentChat.id);
                    if (currentChat.type === "dm") return api.dmMessages(currentChat.id);
                    return null;
                })()
            );
        },

        createRoom,

        startDM,

        inviteRoom,

        getRoomMembers,

        removeRoomMember,

        fetchPins,

        clearAttachments: () => {
            selectedFiles = [];
            renderAttachmentPreview();
        },

        setAdminChat(chatData) {
            adminOverrideChat = chatData;
        },

        clearAdminChat() {
            adminOverrideChat = null;
        },
    };
}