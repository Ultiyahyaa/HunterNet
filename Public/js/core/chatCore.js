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
        globalChat,
        usersList
    } = elements;

    let currentChat = {
        type: "global",
        target: null,
        name: "Global Chat"
    };

    /* =========================
    TIME SYSTEM
    ========================= */

    function getRelativeTime(timestamp) {

        if (!timestamp) return "";

        const now = Date.now();
        const time = new Date(timestamp).getTime();

        const diff =
            Math.floor((now - time) / 1000);

        if (diff < 10) return "just now";
        if (diff < 60) return `${diff}s ago`;

        const minutes =
            Math.floor(diff / 60);

        if (minutes < 60) {
            return `${minutes}m ago`;
        }

        const hours =
            Math.floor(minutes / 60);

        if (hours < 24) {
            return `${hours}h ago`;
        }

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

    /* =========================
    CREATE MESSAGE NODE
    ========================= */

    function createMessageElement(msg) {

        const wrapper =
            document.createElement("div");

        wrapper.className = "message";

        wrapper.dataset.messageId = msg.id;

        if (msg.pinned) {
            wrapper.classList.add(
                "pinned"
            );
        }

        /* =========================
        USER + TIME
        ========================= */

        const userDiv =
            document.createElement("div");

        userDiv.className =
            "message-user";

        userDiv.textContent =
            msg.username;

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

        userDiv.appendChild(timestamp);

        /* =========================
        CONTENT
        ========================= */

        const contentDiv =
            document.createElement("div");

        contentDiv.className =
            "message-content";

        contentDiv.textContent =
            msg.content || msg.message;

        /* =========================
        APPEND
        ========================= */

        wrapper.appendChild(userDiv);
        wrapper.appendChild(contentDiv);

        /* =========================
        ADMIN MODERATION
        ========================= */

        if (isAdmin) {

            const moderation =
                document.createElement("div");

            moderation.className =
                "message-moderation";

            moderation.innerHTML = `

                <button
                    class="message-menu-btn"
                    aria-label="Moderation Menu">
                    ⚙
                </button>

                <div class="message-menu hidden">

                    <button
                        class="menu-action delete-btn"
                        data-id="${msg.id}">
                        DELETE
                    </button>

                    <button
                        class="menu-action pin-btn"
                        data-id="${msg.id}">
                        PIN
                    </button>

                    <button
                        class="menu-action inspect-btn"
                        data-user="${msg.user_id}">
                        INSPECT
                    </button>

                </div>
            `;

            wrapper.appendChild(moderation);
        }

        return wrapper;
    }

    /* =========================
    RENDER MESSAGES
    ========================= */

    function renderMessages(data) {

        messagesDiv.innerHTML = "";

        if (!Array.isArray(data)) {

            console.error(
                "Expected array:",
                data
            );

            return;
        }

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

    /* =========================
    ADMIN EVENTS
    ========================= */

    if (isAdmin) {

        messagesDiv.addEventListener("click", (e) => {

            /* =========================
            TOGGLE MENU
            ========================= */

            const menuBtn =
                e.target.closest(".message-menu-btn");

            if (menuBtn) {

                const message =
                    menuBtn.closest(".message");

                const menu =
                    message.querySelector(".message-menu");

                const isOpen =
                    !menu.classList.contains("hidden");

                /* close all menus first */
                document
                    .querySelectorAll(".message-menu")
                    .forEach(m => m.classList.add("hidden"));

                document
                    .querySelectorAll(".message.menu-open")
                    .forEach(m =>
                        m.classList.remove("menu-open")
                    );

                /* toggle current */
                if (!isOpen) {
                    menu.classList.remove("hidden");
                    message.classList.add("menu-open");
                }

                return;
            }

            /* =========================
            DELETE
            ========================= */

            const deleteBtn =
                e.target.closest(".delete-btn");

            if (deleteBtn) {
                adminHandlers.onDelete?.(
                    deleteBtn.dataset.id
                );
            }

            /* =========================
            INSPECT
            ========================= */

            const inspectBtn =
                e.target.closest(".inspect-btn");

            if (inspectBtn) {
                adminHandlers.onInspect?.(
                    inspectBtn.dataset.user
                );
            }

            /* =========================
            PIN
            ========================= */

            const pinBtn =
                e.target.closest(".pin-btn");

            if (pinBtn) {
                adminHandlers.onPin?.(
                    pinBtn.dataset.id
                );
            }

            /* =========================
            CLOSE ON OUTSIDE CLICK
            ========================= */

            if (!e.target.closest(".message-moderation")) {

                document
                    .querySelectorAll(".message-menu")
                    .forEach(m =>
                        m.classList.add("hidden")
                    );

                document
                    .querySelectorAll(".message.menu-open")
                    .forEach(m =>
                        m.classList.remove("menu-open")
                    );
            }
        });
    }

    /* =========================
    LOAD CHAT
    ========================= */

    async function loadMessages(url) {

        const data =
            await safeFetch(url);

        if (!data) return;

        renderMessages(data);
    }

    /* =========================
    GLOBAL CLICK
    ========================= */

    globalChat?.addEventListener(
        "click",
        () => {

            setActive(globalChat);

            currentChat = {

                type: "global",

                target: null,

                name: "Global Chat"
            };

            chatTitle.textContent =
                "# Global Chat";

            loadMessages(api.global);
        }
    );

    /* =========================
    ACTIVE STATE
    ========================= */

    function setActive(selected) {

        document
            .querySelectorAll(
                ".channel-item"
            )
            .forEach(el =>
                el.classList.remove(
                    "active"
                )
            );

        if (selected) {
            selected.classList.add(
                "active"
            );
        }
    }

    /* =========================
    SEND MESSAGE
    ========================= */

    messageForm?.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const text =
                messageInput.value.trim();

            if (!text) return;

            let endpoint = null;

            if (
                currentChat.type ===
                "global"
            ) {
                endpoint =
                    api.sendGlobal;
            }

            if (
                currentChat.type ===
                "dm"
            ) {
                endpoint =
                    `/dms/api/${currentChat.target}/send`;
            }

            if (
                currentChat.type ===
                "room"
            ) {
                endpoint =
                    `/rooms/api/${currentChat.target}/send`;
            }

            await safeFetch(endpoint, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    content: text
                })
            });

            messageInput.value = "";

            reloadCurrentChat();
        }
    );

    /* =========================
    RELOAD ACTIVE CHAT
    ========================= */

    function reloadCurrentChat() {

        if (currentChat.type === "global") {
            loadMessages(api.global);
        }

        if (currentChat.type === "dm") {
            loadMessages(
                `/dms/api/${currentChat.target}`
            );
        }

        if (currentChat.type === "room") {
            loadMessages(
                `/rooms/${currentChat.target}/messages`
            );
        }
    }

    /* =========================
    INIT
    ========================= */

    reloadCurrentChat();

    return {

        renderMessages,

        reloadCurrentChat,

        loadMessages,

        getCurrentChat: () =>
            currentChat,

        setCurrentChat: (chat) => {
            currentChat = chat;
        }
    };
}