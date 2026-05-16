export function createThreadsCore(config) {

    const { elements, api } = config;

    const {
        threadsList,
        threadTitle,
        threadContent,
        openCreateThreadBtn,
        submitThreadBtn,
        threadsFeed,
        modal,
        modalMessages,
        modalInput,
        modalForm,
        closeModalBtn,
        refreshBtn
    } = elements;

    let currentThread = null;

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

        if (minutes < 60) {
            return `${minutes}m ago`;
        }

        const hours = Math.floor(minutes / 60);

        if (hours < 24) {
            return `${hours}h ago`;
        }

        return `${Math.floor(hours / 24)}d ago`;
    }

    function updateTimestamps() {

        document.querySelectorAll(".timestamp")
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
       THREAD CARD
    ========================= */

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

        div.addEventListener("click", () => openThread(thread));

        return div;
    }

    /* =========================
       RENDER FEED
    ========================= */

    function renderFeed(threads) {

        threadsFeed.innerHTML = "";

        threads.forEach(thread => {

            threadsFeed.appendChild(
                createThreadCard(thread)
            );
        });

        updateTimestamps();
    }

    /* =========================
       LOAD THREADS
    ========================= */

    async function loadThreads() {

        const data = await safeFetch(api.threads);

        if (!Array.isArray(data)) return;

        renderFeed(data);
    }

    /* =========================
       CREATE THREAD
    ========================= */

    submitThreadBtn?.addEventListener("click", async () => {

        const title = threadTitle.value.trim();
        const content = threadContent.value.trim();

        if (!title || !content) return;

        const created = await safeFetch(api.threads, {
            method: "POST",
            body: JSON.stringify({ title, content })
        });

        if (!created) return;

        threadTitle.value = "";
        threadContent.value = "";

        threadsFeed.prepend(
            createThreadCard(created)
        );

        updateTimestamps();
    });

    /* =========================
       OPEN THREAD MODAL
    ========================= */

    async function openThread(thread) {

        currentThread = thread;

        modal.classList.remove("hidden");

        const messages = await safeFetch(
            `/threads/api/${thread.id}/messages`
        );

        modalMessages.innerHTML = "";

        (messages || []).forEach(m => {

            const div = document.createElement("div");

            div.className = "thread-message";

            div.textContent = `${m.username}: ${m.content}`;

            modalMessages.appendChild(div);
        });
    }

    /* =========================
       CLOSE MODAL
    ========================= */

    closeModalBtn?.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    /* =========================
       SEND THREAD MESSAGE
    ========================= */

    modalForm?.addEventListener("submit", async (e) => {

        e.preventDefault();

        if (!currentThread) return;

        const text = modalInput.value.trim();

        if (!text) return;

        await safeFetch(
            `/threads/api/${currentThread.id}/messages`,
            {
                method: "POST",
                body: JSON.stringify({ content: text })
            }
        );

        modalInput.value = "";

        openThread(currentThread);
    });

    /* =========================
       INIT
    ========================= */

    loadThreads();

    return {
        loadThreads
    };
}