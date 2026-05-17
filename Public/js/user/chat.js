import { createChatCore } from "../core/chatCore.js";

/* =========================
CREATE CHAT
========================= */

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
        global: "/chat/api/global",
        sendGlobal: "/chat/api/global/send"
    },

    isAdmin: false
});

/* =========================
PINS PANEL
========================= */

const pinsBtn =
    document.getElementById("pinsBtn");

const pinsPanel =
    document.getElementById("pinsPanel");

const closePins =
    document.getElementById("closePins");

const pinsList =
    document.getElementById("pinsList");

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

            pinsList.appendChild(div);
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