const chatBtn = document.getElementById("chatBtn")
const settingsBtn = document.getElementById("settingsBtn")
const backBtn = document.getElementById("backBtn")
const threadsBtn = document.getElementById("threadsBtn")
const archiveBtn = document.getElementById("archiveBtn")
const statusBtn = document.getElementById("statusBtn")
const logoutBtn = document.getElementById("logoutBtn")

async function loadDashboardUser() {

    try {

        const res =
            await fetch("/auth/api/me");

        if (!res.ok) return;

        const user =
            await res.json();

        return user

    } catch (err) {

        console.error(err);
    }
}

async function loadNode(){
    const node = String((Math.random() * 1000).toFixed(0)).padStart(3, "0");

    document.getElementById("dashboardNode").textContent =  `HN-${node};`
}


function typeWriter(element, text, index = 0) {

    if (index >= text.length) return;

    element.textContent += text[index];

    let delay = 50;

    switch (text[index]) {
        case ".":
            delay = 500;   // longest pause
            break;
        case ",":
            delay = 200;
            break;
        case " ":
            delay = 15;
            break;
    }

    setTimeout(() => {
        typeWriter(element, text, index + 1);
    }, delay);
}

async function initDashboard() {

    const user = await loadDashboardUser();
    if (!user) return;

    await loadNode();

    const message =
        `Access Granted. Secure connection established. Welcome,
        [${user.username}].
        Access your tools and resources below.`;

    typeWriter(
        document.getElementById("dashboardMessage"),
        message
    );
}

chatBtn?.addEventListener("click", () => {
    window.location.href = "/chat"
})

threadsBtn?.addEventListener("click", () => {
    window.location.href = "/threads"
})



settingsBtn?.addEventListener("click", () => {
    window.location.href = "/settings"
})



backBtn?.addEventListener("click", () => {
    window.location.href = "/dashboard"
})



archiveBtn?.addEventListener("click", () => {
    window.location.href = "/archive"
})


statusBtn?.addEventListener("click", () => {
    window.location.href = "/status"
})

logoutBtn?.addEventListener("click", async () => {
    await fetch("/auth/api/logout", {
        method: "POST"
    })

    window.location.href = "/home"

})

initDashboard();