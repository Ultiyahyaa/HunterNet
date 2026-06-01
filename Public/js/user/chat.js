import { createChatCore } from "../core/chatCore.js";

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

/* =========================
CREATE CHAT
========================= */

const logoutBtn = document.getElementById("logoutBtn");

const chat = createChatCore({

    elements: {
        chatTitle: document.getElementById("chatTitle"),
        messagesDiv: document.getElementById("messages"),
        messageForm: document.getElementById("messageForm"),
        messageInput: document.getElementById("messageInput"),
        imageInput: document.getElementById("imageInput"),
        globalChat: document.getElementById("globalChat"),
        usersList: document.getElementById("usersList"),
        roomsList: document.getElementById("roomsList"),

        inviteUserBtn: document.getElementById("inviteUserBtn"),
        roomSettingsBtn: document.getElementById("roomSettingsBtn"),

        createRoomBtn: document.getElementById("createRoomBtn"),
        contactUserBtn: document.getElementById("contactUserBtn"),

        cyberModal: document.getElementById("cyberModal"),
        modalTitle: document.getElementById("modalTitle"),
        modalInput: document.getElementById("modalInput"),
        confirmModalBtn: document.getElementById("confirmModalBtn"),
        closeModalBtn: document.getElementById("closeModalBtn"),
        modalNote: document.getElementById("modalNote"),

        roomSettingsPanel: document.getElementById("roomSettingsPanel"),
        settingsTitle: document.getElementById("settingsTitle"),
        roomSettingsBody: document.querySelector("#roomSettingsPanel .roomSettings-body"),
        roomSettingsFooter: document.querySelector("#roomSettingsPanel .roomSettings-footer"),
        closeSettingsBtn: document.getElementById("closeSettingsBtn"),

        pinsBtn: document.getElementById("pinsBtn"),
        pinsPanel: document.getElementById("pinsPanel"),
        closePins: document.getElementById("closePins"),
        pinsList: document.getElementById("pinsList"),

        attachmentPreview: document.getElementById("attachmentPreview")
    },

    api: {

        global:
            "/chat/api/global",

        sendGlobal:
            "/chat/api/global/send",

        rooms:
            "/chat/api/rooms",

        roomMessages: (id) =>
            `/chat/api/rooms/${id}/messages`,

        sendRoom: (id) =>
            `/chat/api/rooms/${id}/send`,

        dms:
            "/chat/api/dms",

        dmMessages: (id) =>
            `/chat/api/dms/${id}`,

        sendDm: (id) =>
            `/chat/api/dms/${id}/send`
    },

    isAdmin: false,
    currentUserId: currentUser?.id,
});


/* =========================
LOGOUT
========================= */

logoutBtn.addEventListener(
    "click",
    async () => {

        await fetch(
            "/auth/api/logout",
            {
                method: "POST"
            }
        );

        window.location.href =
            "/home";
    }
);