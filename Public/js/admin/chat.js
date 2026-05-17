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

        renderControls: (msg) => `

            <div class="admin-actions">

                <button
                    class="delete-btn"
                    data-id="${msg.id}">
                    delete
                </button>

                <button
                    class="inspect-btn"
                    data-user="${msg.user_id}">
                    inspect
                </button>

                <button
                    class="pin-btn"
                    data-id="${msg.id}">
                    pin
                </button>

            </div>
        `,

        onDelete: async (id) => {

            await fetch(
                `/chat/api/admin/message/${id}`,
                {

                    method: "DELETE",

                    credentials:
                        "include"
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
                        ".message-user"
                    )
                    ?.childNodes[0]
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

            alert(
                "Message pinned"
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
                
                </div>
            
                <div class="pin-content">
                    ${pin.content}
                </div>
            `;

            pinsList.appendChild(div);
        });
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