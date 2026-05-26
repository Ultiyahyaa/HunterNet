import { createChatCore } from "../core/chatCore.js";

const logoutBtn = document.getElementById("logoutBtn");
const pinsBtn = document.getElementById("pinsBtn");
const pinsPanel = document.getElementById("pinsPanel");
const closePins = document.getElementById("closePins");
const pinsList = document.getElementById("pinsList");

const chat = createChatCore({

    elements: {
        chatTitle: document.getElementById("chatTitle"),
        messagesDiv: document.getElementById("messages"),
        messageForm: document.getElementById("messageForm"),
        messageInput: document.getElementById("messageInput"),
        globalChat: document.getElementById("globalChat"),
        usersList: document.getElementById("usersList")
    },

        api: {
            global: "/chat/api/admin/global",
            sendGlobal: "/chat/api/global/send"
        },

    isAdmin: true,

    adminHandlers: {

        onDelete: async (id) => {

            await fetch(
                `/chat/api/admin/message/${id}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );

            chat.reloadCurrentChat();
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

            await fetch(
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

            await fetch(
                `/chat/api/admin/pin/${messageId}`,
                {

                    method: "DELETE",

                    credentials:
                        "include"
                }
            );
        }
    }
});

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

        await fetch(
            `/chat/api/admin/pin/${messageId}`,
            {

                method: "DELETE",

                credentials:
                    "include"
            }
        );

        btn.closest(".pin-entry")
            ?.remove();
    }
);

closePins?.addEventListener(
    "click",
    () => {
        pinsPanel.classList.add(
            "hidden"
        );
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

logoutBtn.addEventListener("click", async () => {
    const res = await fetch("/admin/api/logout", {
        method: "POST",
        credentials: "include"
    })
})
