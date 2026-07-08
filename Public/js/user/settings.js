const passForm = document.getElementById("changePasswordForm")
const factionForm = document.getElementById("changeFactionForm")
const adminAccessBtn = document.getElementById("adminAccessBtn")

passForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const currentPassword = document.getElementById("currentPassword").value
  const newPassword = document.getElementById("newPassword").value

  const res = await fetch("/api/changePassword", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      currentPassword,
      newPassword
    })
  })

  const data = await res.json()

  if (data.success) {
    alert("Password changed successfully!")
  } else {
    alert(data.message || "Failed to change password")
  }
})

factionForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const newFaction = document.getElementById("selectFaction").value

  const res = await fetch("/api/changeFaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      newFaction
    })
  })

  const data = await res.json()

  if (data.success) {
    alert("Faction changed successfully!")
  } else {
    alert(data.message || "Failed to change Faction")
  }
})

adminAccessBtn.addEventListener("click", (e) => {
  e.preventDefault();
  
  window.location.href = "/adminLogin";
});

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
  logoutBtn.addEventListener("click", async () => {
    await fetch("/auth/api/logout", {
      method: "POST"
    })

    window.location.href = "/home"
  
  })
} catch (e) {
  console.log("Unable to grab Logout Button ID, skipping event listener")
}
