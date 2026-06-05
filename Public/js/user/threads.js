import { createThreadsCore } from "../core/threadsCore.js";

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

const thread = createThreadsCore({

    elements: {

        joinedThreadsList:
            document.getElementById("joinedThreadsList"),

        onlineUsers:
            document.getElementById("onlineUsers"),

    },

    api: {
        threads: "/threads/api/",
        messages: "/threads/api/:threadId/messages",
    },

    currentUserId: window.currentUserId,
    currentUsername: currentUser?.username || "Anonymous"

});

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async () => {
    await fetch("/auth/api/logout", {
        method: "POST"
    })

    window.location.href = "/home"

})



