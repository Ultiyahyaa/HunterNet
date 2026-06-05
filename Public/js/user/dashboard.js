const chatBtn = document.getElementById("chatBtn")
const logoutBtn = document.getElementById("logoutBtn")
const settingsBtn = document.getElementById("settingsBtn")
const backBtn = document.getElementById("backBtn")
const threadsBtn = document.getElementById("threadsBtn")
const archiveBtn = document.getElementById("archiveBtn")
const statusBtn = document.getElementById("statusBtn")

async function loadDashboardUser() {

    try {

        const res =
            await fetch("/auth/api/me");

        if (!res.ok) return;

        const user =
            await res.json();

        document.getElementById(
            "dashboardUsername"
        ).textContent = user.username;

    } catch (err) {

        console.error(err);
    }
}

loadDashboardUser();


logoutBtn?.addEventListener("click", async () => {
    await fetch("/auth/api/logout", {
      method: "POST"
    })

    window.location.href = "/home"
  
  })


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