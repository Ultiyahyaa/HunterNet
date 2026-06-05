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
    } = elements;

    const socket = io();
    const pageContainer = document.querySelector(".threads-container");

    let currentThread = null;
    let allThreads = [];
    let onlineUsersList = [];

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
                el.textContent = `// ${getRelativeTime(time)}`;
            });
    }

    setInterval(updateTimestamps, 60000);

    /* =========================
       SAFE FETCH
    ========================= */

    async function safeFetch(url, options = {}) {
        try {
            const res = await fetch(url, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
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
       LOAD FEED
    ========================= */

    function switchToFeed() {
        const feedTemplate = document.getElementById("threadsFeedTemplate");
        pageContainer.innerHTML = feedTemplate.innerHTML;

        if (currentThread) {
            socket.emit("leave:thread", currentThread);
            currentThread = null;
        }

        setupFeedListeners();
        loadThreads();
    }

    function setupFeedListeners() {
        const submitBtn = pageContainer.querySelector("#submitThreadBtn");
        const titleInput = pageContainer.querySelector("#threadTitle");
        const contentInput = pageContainer.querySelector("#threadContent");

        submitBtn?.addEventListener("click", async () => {
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();

            if (!title || !content) return;

            const created = await safeFetch(api.threads, {
                method: "POST",
                body: JSON.stringify({ title, content })
            });

            if (!created) return;

            titleInput.value = "";
            contentInput.value = "";

            const feed = pageContainer.querySelector("#threadsFeed");
            feed.prepend(createThreadCard(created));
            updateTimestamps();
        });
    }

    function createThreadCard(thread) {
        const div = document.createElement("div");
        div.className = "post-card";

        const time = thread.created_at;

        div.innerHTML = `
            <div class="post-title">${thread.title}</div>
            <div class="post-content">${thread.content}</div>
            <div class="post-meta">
                <span class="post-author">${thread.username}</span>
                <span class="timestamp" data-time="${time}">
                    // ${getRelativeTime(time)}
                </span>
            </div>
        `;

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
        const data = await safeFetch(api.threads);
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

        socket.emit("join:thread", threadId);
        setupThreadListeners(threadId, threadData);
        loadThreadMessages(threadId);

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
        let selectedAttachments = [];

        backBtn?.addEventListener("click", () => {
            switchToFeed();
        });

        attachBtn?.addEventListener("click", () => {
            imageInput.click();
        });

        imageInput?.addEventListener("change", () => {
            selectedAttachments = Array.from(imageInput.files);
            updateAttachmentPreview(selectedAttachments);
        });

        messageForm?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const content = messageInput.value.trim();

            if (!content) return;

            const message = await safeFetch(`${api.threads}/${threadId}/messages`, {
                method: "POST",
                body: JSON.stringify({ content })
            });

            if (!message) return;

            messageInput.value = "";
            selectedAttachments = [];
            updateAttachmentPreview([]);

            addMessageToView(message);
        });
    }

    function updateAttachmentPreview(files) {
        const preview = pageContainer.querySelector("#attachmentPreview");
        if (!preview) return;

        if (files.length === 0) {
            preview.classList.add("hidden");
            return;
        }

        preview.innerHTML = "";
        preview.classList.remove("hidden");

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement("img");
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    async function loadThreadMessages(threadId) {
        const messages = await safeFetch(`${api.threads}/${threadId}/messages`);
        if (!Array.isArray(messages)) return;

        const messagesDiv = pageContainer.querySelector("#messages");
        if (!messagesDiv) return;

        messagesDiv.innerHTML = "";
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
        timestamp.textContent = ` // ${getRelativeTime(msg.created_at)}`;
        userDiv.appendChild(timestamp);

        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        contentDiv.textContent = msg.content;

        wrapper.appendChild(userDiv);
        wrapper.appendChild(contentDiv);

        return wrapper;
    }

    function addMessageToView(msg) {
        const messagesDiv = pageContainer.querySelector("#messages");
        if (!messagesDiv) return;

        messagesDiv.appendChild(createMessageElement(msg));
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        updateTimestamps();
    }

    /* =========================
       SIDEBAR - JOINED THREADS
    ========================= */

    function updateJoinedThreadsList() {
        if (!joinedThreadsList) return;

        joinedThreadsList.innerHTML = "";

        allThreads.forEach(thread => {
            const item = document.createElement("div");
            item.className = "thread-item";
            if (currentThread === thread.id) {
                item.classList.add("active");
            }

            item.textContent = `# ${thread.title}`;
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




    /* =========================
       INIT
    ========================= */

    switchToFeed();

    return {
        loadThreads,
        switchToFeed,
        switchToThread
    };
}
