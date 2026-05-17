const manageUsersBtn =
  document.getElementById("manageUsersBtn")

const chatModerationBtn =
  document.getElementById("chatModerationBtn")

const threadsBtn =
  document.getElementById("threadsBtn")

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

threadsBtn.addEventListener("click", () => {
  window.location.href = "/admin/threads"
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
    const res = await fetch("/admin/api/logout", {
      method: "POST",
      credentials: "include"
    })

})