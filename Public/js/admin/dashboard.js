const manageUsersBtn =
  document.getElementById("manageUsersBtn")

const chatModerationBtn =
  document.getElementById("chatModerationBtn")

const boardsBtn =
  document.getElementById("boardsBtn")

const databaseBtn =
  document.getElementById("databaseBtn")

const securityBtn =
  document.getElementById("securityBtn")

const systemBtn =
  document.getElementById("systemBtn")

const logoutBtn =
  document.getElementById("logoutBtn")


window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/admin/api/login", {
      method: "POST",
      credentials: "include"
    })

    const data = await res.json()

    if (!data.success) {
      alert("Admin access denied")
      window.location.href = "/adminLogin"
    }

  } catch (err) {
    console.log(err)
    window.location.href = "/adminLogin"
  }
})


// ------------------------
// NAV ACTIONS (PLACEHOLDERS)
// ------------------------

manageUsersBtn.addEventListener("click", () => {
  window.location.href = "/admin/users"
})

chatModerationBtn.addEventListener("click", () => {
  window.location.href = "/admin/chat"
})

boardsBtn.addEventListener("click", () => {
  alert("Board moderation coming soon.")
})

databaseBtn.addEventListener("click", () => {
  alert("Database monitor coming soon.")
})

securityBtn.addEventListener("click", () => {
  alert("Security logs coming soon.")
})

systemBtn.addEventListener("click", () => {
  alert("System controls coming soon.")
})


// ------------------------
// ADMIN LOGOUT (EXIT ADMIN MODE ONLY)
// ------------------------

logoutBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/admin/api/logout", {
      method: "POST",
      credentials: "include"
    })

    const text = await res.text()
    console.log("RAW RESPONSE:", text)

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error("Server did not return JSON")
    }

    if (!res.ok) {
      throw new Error(data.message || "Request failed")
    }

    if (data.success) {
      window.location.href = "/dashboard"
    } else {
      throw new Error("Failed to exit admin mode")
    }

  } catch (err) {
    console.log("ADMIN LOGOUT ERROR:", err)

    alert("Server error while exiting admin mode")

    logoutBtn.textContent = "LOG OUT"
    logoutBtn.disabled = false
  }
})