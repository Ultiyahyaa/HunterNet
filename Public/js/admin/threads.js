import {createThreadsCore} from "../core/threadsCore.js";

const logoutBtn = document.getElementById("logoutBtn");

const currentUserResponse = await fetch(
    "/auth/api/me",
    {
        credentials: "include"
    }
);

const currentUser =
    currentUserResponse.ok
        ? await currentUserResponse.json()
        : null;

window.currentUserId =
    currentUser?.id || null;

async function jsonFetch(url, options = {}) {
    const res = await fetch(url, {
        credentials: "include",
        ...options
    });

    if (!res.ok) {
        return null;
    }

    return res.json();
}

const thread = createThreadsCore({

    elements: {
        joinedThreadsList:
            document.getElementById("joinedThreadsList"),

        onlineUsers:
            document.getElementById("onlineUsers"),

        pinsPanel:
            document.getElementById("pinsPanel"),

        pinsList:
            document.getElementById("pinsList"),

        attachmentPreview:
            document.getElementById("attachmentPreview")
    },

    api: {
        threads: "/threads/api"
    },

    isAdmin: true,
    currentUserId: window.currentUserId,
    currentUsername: currentUser?.username || "Administrator",

    adminHandlers: {
        onToggleThreadPin: async (threadId) => {
            await jsonFetch(
                `/threads/api/admin/thread/${threadId}/pin`,
                {
                    method: "PATCH"
                }
            );

            await thread.loadThreads();
        },

        onToggleThreadLock: async (threadId) => {
            await jsonFetch(
                `/threads/api/admin/thread/${threadId}/lock`,
                {
                    method: "PATCH"
                }
            );

            await thread.loadThreads();
        },

        onDeleteThread: async (threadId) => {
            const confirmed = window.confirm(
                "Delete this thread and all of its messages?"
            );

            if (!confirmed) return;

            const result = await jsonFetch(
                `/threads/api/admin/thread/${threadId}`,
                {
                    method: "DELETE"
                }
            );

            if (result?.success) {
                thread.switchToFeed();
            }
        },

        onDeleteMessage: async (messageId) => {
            const confirmed = window.confirm(
                "Delete this message?"
            );

            if (!confirmed) return;

            await jsonFetch(
                `/threads/api/admin/message/${messageId}`,
                {
                    method: "DELETE"
                }
            );
        },

        onPinMessage: async (messageId) => {
            await jsonFetch(
                `/threads/api/admin/message/${messageId}/pin`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        thread_id: thread.getCurrentThreadId(),
                        content: thread.getMessageContent(messageId),
                        username: thread.getMessageUsername(messageId)
                    })
                }
            );
        },

        onUnpinMessage: async (messageId) => {
            await jsonFetch(
                `/threads/api/admin/message/${messageId}/pin`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        thread_id: thread.getCurrentThreadId()
                    })
                }
            );
        },

        onDeleteAttachment: async (attachmentId) => {
            const confirmed = window.confirm(
                "Delete this image?"
            );

            if (!confirmed) return;

            const result = await jsonFetch(
                `/threads/api/admin/attachment/${attachmentId}`,
                {
                    method: "DELETE"
                }
            );

            if (result?.success) {
                await thread.reloadCurrentThread();
            }
        },

        onInspect: async (userId) => {
            if (!userId) {
                alert("No user id is available for this item.");
                return;
            }

            const res = await fetch(
                `/chat/api/admin/user/${userId}`,
                {
                    credentials: "include"
                }
            );

            if (!res.ok) {
                alert("Unable to inspect user.");
                return;
            }

            const data = await res.json();

            alert(
                `USER INFO\n\n` +
                `ID: ${data.id}\n` +
                `Username: ${data.username}\n` +
                `Admin: ${data.is_admin}`
            );
        }
    }
});

logoutBtn?.addEventListener("click", async () => {
    await fetch("/admin/api/logout", {
        method: "POST",
        credentials: "include"
    });

    window.location.href = "/adminLogin";
});
