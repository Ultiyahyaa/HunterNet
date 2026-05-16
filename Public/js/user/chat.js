import { createChatCore } from "../core/chatCore.js";

createChatCore({
    elements: {
        chatTitle: document.getElementById("chatTitle"),
        messagesDiv: document.getElementById("messages"),
        messageForm: document.getElementById("messageForm"),
        messageInput: document.getElementById("messageInput"),
        globalChat: document.getElementById("globalChat"),
        usersList: document.getElementById("usersList")
    },

    api: {
        global: "/chat/api/global",
        sendGlobal: "/chat/api/global/send"
    },

    isAdmin: false
});