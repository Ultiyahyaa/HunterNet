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
const createRoomBtn = document.getElementById("createRoomBtn");
const contactUserBtn = document.getElementById("contactUserBtn");
const inviteUserBtn = document.getElementById("inviteUserBtn");
const cyberModal = document.getElementById("cyberModal");

const modalTitle =
    document.getElementById(
        "modalTitle"
    );

const modalInput =
    document.getElementById(
        "modalInput"
    );

const confirmModalBtn =
    document.getElementById(
        "confirmModalBtn"
    );

const closeModalBtn =
    document.getElementById(
        "closeModalBtn"
    );

const chat = createChatCore({

    elements: {

        chatTitle:
            document.getElementById(
                "chatTitle"
            ),

        messagesDiv:
            document.getElementById(
                "messages"
            ),

        messageForm:
            document.getElementById(
                "messageForm"
            ),

        messageInput:
            document.getElementById(
                "messageInput"
            ),

        globalChat:
            document.getElementById(
                "globalChat"
            ),

        usersList:
            document.getElementById(
                "usersList"
            ),

        roomsList:
            document.getElementById(
                "roomsList"
            ),

        inviteUserBtn
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

    isAdmin: false
});

let modalAction = null;

/* =========================
MODAL
========================= */

function openModal(action) {

    modalAction = action;

    if (action === "createRoom") {

        modalTitle.textContent =
            "Create New Room";

        modalInput.placeholder =
            "ENTER ROOM NAME";
    }

    else if (
        action === "createDM"
    ) {

        modalTitle.textContent =
            "Contact User Privately";

        modalInput.placeholder =
            "ENTER USERNAME";
    }

    else if (
        action === "inviteUser"
    ) {

        modalTitle.textContent =
            "Invite User To Room";

        modalInput.placeholder =
            "ENTER USERNAME";
    }

    modalInput.value = "";

    cyberModal.classList.remove(
        "hidden"
    );

    modalInput.focus();
}

function closeModal() {

    cyberModal.classList.add(
        "hidden"
    );

    modalAction = null;

    modalInput.value = "";
}

/* =========================
HANDLE MODAL
========================= */

async function handleModalConfirm() {

    const value =
        modalInput.value.trim();

    if (!value) {
        return;
    }

    /* =========================
    CREATE ROOM
    ========================= */

    if (
        modalAction ===
        "createRoom"
    ) {

        const response =
            await fetch(
                "/chat/api/rooms/create",
                {
                    method: "POST",

                    credentials:
                        "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name: value
                    })
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {

            alert(
                result.message ||
                "Failed to create room"
            );

            return;
        }

        await chat.loadRooms();

        chat.switchChat({

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
        modalAction ===
        "createDM"
    ) {

        const response =
            await fetch(
                "/chat/api/dms/start",
                {
                    method: "POST",

                    credentials:
                        "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        username: value
                    })
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {

            alert(
                result.message ||
                "User not found"
            );

            return;
        }

        await chat.loadDMs();

        chat.switchChat({

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
        modalAction ===
        "inviteUser"
    ) {

        const current =
            chat.getCurrentChat();

        if (
            current.type !==
            "room"
        ) {
            return;
        }

        const response =
            await fetch(
                `/chat/api/rooms/${current.id}/invite`,
                {
                    method: "POST",

                    credentials:
                        "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        username: value
                    })
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {

            alert(
                result.message ||
                "Failed to invite user"
            );

            return;
        }

        alert(
            `${result.username} added to room`
        );

        closeModal();

        return;
    }
}

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
            chat.getCurrentChat();

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
    closeModal
);

confirmModalBtn?.addEventListener(
    "click",
    handleModalConfirm
);

cyberModal?.addEventListener(
    "click",
    (e) => {

        if (
            e.target === cyberModal
        ) {

            closeModal();
        }
    }
);

/* =========================
PINS PANEL
========================= */

const pinsBtn =
    document.getElementById(
        "pinsBtn"
    );

const pinsPanel =
    document.getElementById(
        "pinsPanel"
    );

const closePins =
    document.getElementById(
        "closePins"
    );

const pinsList =
    document.getElementById(
        "pinsList"
    );

/* =========================
OPEN PINS
========================= */

pinsBtn?.addEventListener(
    "click",
    async () => {

        pinsPanel.classList.remove(
            "hidden"
        );

        const current =
            chat.getCurrentChat();

        const params =
            new URLSearchParams({

                type:
                current.type,

                target:
                    current.target || ""
            });

        const res =
            await fetch(
                `/chat/api/pins?${params}`,
                {
                    credentials:
                        "include"
                }
            );

        const pins =
            await res.json();

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

            pinsList.appendChild(
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

        pinsPanel.classList.add(
            "hidden"
        );
    }
);

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