import { createChatCore } from "../core/chatCore.js";

const logoutBtn = document.getElementById("logoutBtn");
const contactsList = document.getElementById("contactsList");
const contactInfo = document.getElementById("contactInfo");

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
        global: "/chat/api/global",
        sendGlobal: "/chat/api/global/send",

        rooms: "/chat/api/rooms",
        roomMessages: (id) => `/chat/api/rooms/admin/${id}/messages`,
        sendRoom: (id) => `/chat/api/rooms/${id}/send`,

        dms: "/chat/api/dms",
        dmMessages: (id) => `/chat/api/dms/${id}`,
        sendDm: (id) => `/chat/api/dms/${id}/send`
    },

    isAdmin: true,

    adminHandlers: {

        onDelete: async (id) => {

            const current =
                chat.getCurrentChat();

            await fetch(
                `/chat/api/admin/message/${id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        chatType: current.type
                    })
                }
            );
        },

        onInspect: async (userId) => {

            const res =
                await fetch(
                    `/chat/api/admin/user/${userId}`,
                    {
                        credentials:
                            "include"
                    }
                );

            const data =
                await res.json();

            alert(
                `USER INFO\n\n` +
                `ID: ${data.id}\n` +
                `Username: ${data.username}\n` +
                `Admin: ${data.is_admin}`
            );
        },

        onPin: async (messageId) => {

            const current =
                chat.getCurrentChat();

            const messageElement =
                document.querySelector(
                    `[data-message-id="${messageId}"]`
                );

            const content =
                messageElement
                    ?.querySelector(
                        ".message-content"
                    )
                    ?.textContent;

            const username =
                messageElement
                    ?.querySelector(
                        ".message-user span"
                    )
                    ?.textContent
                    ?.trim();

            const res = await fetch(
                "/chat/api/admin/pin",
                {

                    method: "POST",

                    credentials:
                        "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message_id:
                        messageId,

                        chat_type:
                        current.type,

                        chat_target:
                        current.target,

                        content,

                        username
                    })
                }
            );
        },

        onUnpin: async (messageId) => {

            const current =
                chat.getCurrentChat();

            const res = await fetch(
                `/chat/api/admin/pin/${messageId}`,
                {

                    method: "DELETE",

                    credentials:
                        "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        chat_type:
                        current.type,

                        chat_target:
                        current.target
                    })
                }
            );

        }
    }
});

const adminSocket = io();
let adminDmRoomId = null;
let selectedAdminUser = null;
let selectedAdminContact = null;

const coreSwitchChat = chat.switchChat;
chat.switchChat = async (chatData) => {
    exitAdminDmView();
    
    // Join appropriate socket room for live updates
    if (chatData.type === "room") {
        adminSocket.emit("join:room", chatData.id);
    } else if (chatData.type === "global") {
        adminSocket.emit("join:global");
    }
    
    return await coreSwitchChat(chatData);
};

function showMessageForm() {
    document.getElementById("messageForm").style.display = "flex";
}

function hideMessageForm() {
    document.getElementById("messageForm").style.display = "none";
}

function clearContactSelection() {
    selectedAdminUser = null;
    selectedAdminContact = null;
    contactsList.innerHTML = "";
    contactInfo.textContent = "Select a user to inspect contacts";
    document.querySelectorAll(".contact-item").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".user-item").forEach(el => el.classList.remove("active"));
}

function exitAdminDmView() {

    if (!selectedAdminUser && !selectedAdminContact)
        return;

    chat.clearAdminChat();

    selectedAdminUser = null;
    selectedAdminContact = null;
    adminDmRoomId = null;

    showMessageForm();

    contactInfo.textContent =
        "Select a user to inspect contacts";

    document
        .querySelectorAll(".contact-item")
        .forEach(el =>
            el.classList.remove("active")
        );
}

async function loadUsers() {
    const res = await fetch("/admin/api/users", {
        credentials: "include"
    });

    if (!res.ok) {
        usersList.innerHTML = "<div class='channel-item'>Unable to load users.</div>";
        return;
    }

    const payload = await res.json();
    const users = Array.isArray(payload)
        ? payload
        : payload?.users || [];

    usersList.innerHTML = "";

    if (!users.length) {
        usersList.innerHTML = "<div class='channel-item'>No users found.</div>";
        return;
    }

    users.forEach(user => {
        const div = document.createElement("div");
        div.className = "channel-item user user-item";
        div.dataset.userId = user.id;
        div.textContent = `@ ${user.username}`;

        div.addEventListener("click", () => {
            selectAdminUser(user, div);
        });

        usersList.appendChild(div);
    });
}

function setActiveContact(element) {
    document.querySelectorAll(".contact-item")
        .forEach(el => el.classList.remove("active"));

    element?.classList.add("active");

    document.querySelectorAll(".contact-item").forEach(el => el.classList.remove("active"));
    element?.classList.add("active");
}

async function selectAdminUser(user, element) {
    selectedAdminUser = user;
    selectedAdminContact = null;
    adminDmRoomId = null;

    contactInfo.textContent = `Selected: @ ${user.username}`;
    document.querySelectorAll(".user-item").forEach(el => el.classList.remove("active"));
    element.classList.add("active");

    await loadContactsForUser(user.id);
}

async function loadContactsForUser(userId) {
    const res = await fetch(`/chat/api/dms/admin/${userId}/contacts`, {
        credentials: "include"
    });

    if (!res.ok) {
        contactsList.innerHTML = "<div class='channel-item'>Unable to load contacts.</div>";
        return;
    }

    const contacts = await res.json();

    contactsList.innerHTML = "";

    if (!contacts.length) {
        contactsList.innerHTML = "<div class='channel-item'>No contacts found.</div>";
        return;
    }

    contacts.forEach(contact => {
        const div = document.createElement("div");
        div.className = "channel-item user contact-item";
        div.dataset.contactId = contact.id;
        div.textContent = `@ ${contact.username}`;

        div.addEventListener("click", () => {
            selectAdminContact(contact, div);
        });

        contactsList.appendChild(div);
    });
}

async function selectAdminContact(contact, element) {

    if (!selectedAdminUser) return;

    selectedAdminContact = contact;

    adminDmRoomId =
        [Number(selectedAdminUser.id), Number(contact.id)]
            .sort((a, b) => a - b)
            .join("-");

    chat.setAdminChat({
        type: "dm",
        id: contact.id,
        roomId: adminDmRoomId,
        target: contact.id,
        name: `@ ${contact.username}`
    });

    setActiveContact(element);

    hideMessageForm();

    chat.renderMessages([]);

    chatTitle.textContent =
        `@ ${selectedAdminUser.username} ↔ @ ${contact.username}`;

    await joinAdminDmRoom(adminDmRoomId);

    await loadAdminDmThread(
        selectedAdminUser.id,
        contact.id
    );
}

async function joinAdminDmRoom(roomId) {
    if (!roomId) return;
    adminSocket.emit("join:dm", roomId);
}

async function loadAdminDmThread(userId, contactId) {
    const res = await fetch(`/chat/api/dms/admin/${userId}/${contactId}`, {
        credentials: "include"
    });

    if (!res.ok) {
        chat.renderMessages([]);
        return;
    }

    const messages = await res.json();
    chat.renderMessages(messages);
}

adminSocket.on("dm:message:new", (msg) => {
    if (adminDmRoomId !== msg.roomId) return;
    loadAdminDmThread(selectedAdminUser?.id, selectedAdminContact?.id);
});

loadUsers();

/* =========================
PINS PANEL
========================= */

pinsBtn?.addEventListener(
    "click",
    async () => {

        pinsPanel.classList.remove(
            "hidden"
        );

        const current =
            chat.getCurrentChat();

        const pins =
            await chat.fetchPins(
                current.type,
                current.target
            );

        pinsList.innerHTML = "";

        if (!pins || !pins.length) {
            pinsList.innerHTML = "<div class='empty-pins'>NO PINNED MESSAGES</div>";
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
            
                    <button
                        class="pin-remove-btn"
                        data-id="${pin.message_id}">
                        UNPIN
                    </button>
            
                </div>
            
                <div class="pin-content">
                    ${pin.content}
                </div>
            `;

            pinsList.appendChild(div);
        });
    }
);

/* =========================
UNPIN FROM PINS PANEL
========================= */

pinsList?.addEventListener(
    "click",
    async (e) => {

        const btn =
            e.target.closest(
                ".pin-remove-btn"
            );

        if (!btn) return;

        const messageId =
            btn.dataset.id;

        const current =
            chat.getCurrentChat();

        const res = await fetch(
            `/chat/api/admin/pin/${messageId}`,
            {

                method: "DELETE",

                credentials:
                    "include",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    chat_type:
                    current.type,

                    chat_target:
                    current.target
                })
            }
        );

        if (res.ok) {
            btn.closest(".pin-entry")
                ?.remove();
        }
    }
);



logoutBtn.addEventListener("click", async () => {
    const res = await fetch("/admin/api/logout", {
        method: "POST",
        credentials: "include"
    })
})
