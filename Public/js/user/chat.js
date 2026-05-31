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

const attachBtn = document.getElementById("attachBtn");
const imageInput = document.getElementById("imageInput");
const attachmentPreview = document.getElementById("attachmentPreview");

const createRoomBtn = document.getElementById("createRoomBtn");
const contactUserBtn = document.getElementById("contactUserBtn");
const inviteUserBtn = document.getElementById("inviteUserBtn");
const roomSettingsBtn = document.getElementById("roomSettingsBtn");

const cyberModal = document.getElementById("cyberModal");
const modalTitle = document.getElementById("modalTitle");
const modalInput = document.getElementById("modalInput");
const confirmModalBtn = document.getElementById("confirmModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const roomSettingsPanel = document.getElementById("roomSettingsPanel");
const settingsTitle = document.getElementById("settingsTitle");
const roomSettingsBody = document.querySelector("#roomSettingsPanel .roomSettings-body");
const roomSettingsFooter = document.querySelector("#roomSettingsPanel .roomSettings-footer");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

const pinsBtn = document.getElementById("pinsBtn");
const pinsPanel = document.getElementById("pinsPanel");
const closePins = document.getElementById("closePins");
const pinsList = document.getElementById("pinsList");

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

        imagesInput:
            document.getElementById(
                "imagesInput"
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

        inviteUserBtn,

        roomSettingsBtn,
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

let selectedImages = [];
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
    modalInput.focus();
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

    activeModal = null;
}

async function renderRoomSettings() {
    const current = chat.getCurrentChat();

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
                    ${isCurrentUser ? "Current" : "Remove"}
                </button>
            </li>
        `;
    }).join("");
}

async function fetchRoomMembers(roomId) {
    try {
        const response = await fetch(`/chat/api/rooms/${roomId}/members`, {
            credentials: "include"
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            return null;
        }

        return result.members || [];
    } catch (err) {
        return null;
    }
}

async function handleRemoveRoomMember(memberId) {
    const current = chat.getCurrentChat();

    if (!current || current.type !== "room") {
        return;
    }

    const confirmation = window.confirm("Remove this member from the room?");
    if (!confirmation) {
        return;
    }

    const response = await fetch(`/chat/api/rooms/${current.id}/members/${memberId}`, {
        method: "DELETE",
        credentials: "include"
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        alert(result.message || "Unable to remove member.");
        return;
    }

    await renderRoomSettings();
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
        activeModal ===
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
        activeModal ===
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
OPEN FILE PICKER
========================= */

attachBtn?.addEventListener(
    "click",
    () => {

        imageInput.click();
    }
);

/* =========================
SELECT IMAGES
========================= */

imageInput?.addEventListener(
    "change",
    () => {

        const files =
            Array.from(
                imageInput.files
            );

        if (!files.length) {
            return;
        }

        selectedImages = [
            ...selectedImages,
            ...files
        ];

        chat.setAttachments(selectedImages);

        renderAttachments();

        imageInput.value = "";
    }
);

/* =========================
RENDER ATTACHMENTS
========================= */

function renderAttachments() {

    attachmentPreview.innerHTML = "";

    if (!selectedImages.length) {

        attachmentPreview.classList.add(
            "hidden"
        );

        return;
    }

    attachmentPreview.classList.remove(
        "hidden"
    );

    selectedImages.forEach(
        (file, index) => {

            const reader =
                new FileReader();

            reader.onload =
                (e) => {

                    const div =
                        document.createElement(
                            "div"
                        );

                    div.className =
                        "attachment-item";

                    const img =
                        document.createElement(
                            "img"
                        );

                    img.src =
                        e.target.result;

                    img.className =
                        "attachment-thumb";

                    img.addEventListener(
                        "click",
                        () => openImageModal(
                            e.target.result
                        )
                    );

                    const btn =
                        document.createElement(
                            "button"
                        );

                    btn.type = "button";
                    btn.className =
                        "remove-attachment";
                    btn.dataset.index = index;
                    btn.textContent = "×";

                    btn.addEventListener(
                        "click",
                        (event) => {

                            event.preventDefault();
                            event.stopPropagation();

                            const idx =
                                Number(
                                    event.target
                                        .dataset.index
                                );

                            selectedImages.splice(
                                idx,
                                1
                            );

                            renderAttachments();
                        }
                    );

                    div.appendChild(img);
                    div.appendChild(btn);

                    attachmentPreview.appendChild(
                        div
                    );
                };

            reader.readAsDataURL(
                file
            );
        }
    );
}

/* =========================
CLEAR SELECTED IMAGES
========================= */

window.clearSelectedImages = () => {
    selectedImages = [];
    renderAttachments();
};

/* =========================
REMOVE ATTACHMENT
========================= */

attachmentPreview?.addEventListener(
    "click",
    (e) => {

        const btn =
            e.target.closest(
                ".remove-attachment"
            );

        if (!btn) {
            return;
        }

        const index =
            Number(
                btn.dataset.index
            );

        selectedImages.splice(
            index,
            1
        );

        chat.setAttachments(selectedImages);

        chat.setAttachments(selectedImages);

        renderAttachments();
    }
);

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