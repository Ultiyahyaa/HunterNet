const chatBtn = document.getElementById("chatBtn")
const logoutBtn = document.getElementById("logoutBtn")
const settingsBtn = document.getElementById("SettingsBtn")
const backBtn = document.getElementById("backBtn")
const loginBtn = document.getElementById("loginBtn")
const boardsBtn = document.getElementById("boardsBtn")

try{
  loginBtn.addEventListener("click", () => {
    window.location.href = "/login"
  })
} catch (e) {
  console.log("Unable to grab Login Button ID, skipping event listener")
}

try{
  logoutBtn.addEventListener("click", async () => {
    await fetch("/auth/api/logout", {
      method: "POST"
    })

    window.location.href = "/home"
  
  })
} catch (e) {
  console.log("Unable to grab Logout Button ID, skipping event listener")
}

try{
  chatBtn.addEventListener("click", () => {
    window.location.href = "/chat"
})
} catch (e) {
  console.log("Unable to grab Chat Button ID, skipping event listener")
}

try{
  settingsBtn.addEventListener("click", () => {
    window.location.href = "/settings"
  })
} catch (e) {
  console.log("Unable to grab Settings Button ID, skipping event listener")
}

try{
  backBtn.addEventListener("click", () => {
    window.location.href = "/dashboard"
  })
} catch (e) {
  console.log("Unable to grab Back Button ID, skipping event listener")
}

try{
  boardsBtn.addEventListener("click", () => {
    window.location.href = "/boards"
  })
} catch (e) {
  console.log("Unable to grab Boards Button ID, skipping event listener")
}

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