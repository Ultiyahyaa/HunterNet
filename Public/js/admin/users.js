const userList = document.getElementById("userList")
const logoutBtn = document.getElementById("logoutBtn")

async function loadUsers() {

  try {

    const res = await fetch("/admin/api/users", {
        credentials: "include"
      })

    const data = await res.json()

    userList.innerHTML = ""

    data.users.forEach(user => {

      const div = document.createElement("div")

      div.className = "user-card"
      div.innerHTML = `
        <h3>${user.username}</h3>
        <p>ID: ${user.id}</p>
        <p>
          ROLE:
          ${
            user.is_admin
              ? "ADMIN"
              : "USER"
          }
        </p>
        <div class="button-group">
          <button
            class="role-btn"
            onclick="toggleRole(
              ${user.id},
              ${user.is_admin}
            )"
          >
            ${
              user.is_admin
                ? "REMOVE ADMIN"
                : "MAKE ADMIN"
            }
          </button>

          <button
            class="delete-btn"
            onclick="deleteUser(${user.id})"
          >
            DELETE
          </button>

        </div>
      `

      userList.appendChild(div)

    })

  } catch (err) {
    console.log(err)
    alert("Failed to load users")

  }

}

async function toggleRole(id, currentRole) {
  try {
    const res = await fetch(`/admin/api/user/${id}/role`, {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            is_admin: !currentRole
          })
        }
      )

    const data = await res.json()

    if (data.success) {
      loadUsers()

    } else {
      alert(data.message)

    }
  } catch (err) {
    console.log(err)
    alert("Role update failed")

  }

}

async function deleteUser(id) {

  if (!confirm("Delete this user?")) return

  try {
    const res = await fetch(`/admin/api/user/${id}`,
        {
          method: "DELETE",
          credentials: "include"
        })

    const data = await res.json()

    if (data.success) {
      loadUsers()

    } else {
      alert(data.message)

    }

  } catch (err) {
    console.log(err)
    alert("Delete failed")

  }
}

loadUsers()

logoutBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/admin/api/logout", {
      method: "POST",
      credentials: "include"
    })

    window.location.href = "/adminLogin"

  } catch (err) {
    console.log("ADMIN LOGOUT ERROR:", err)

    alert("Server error while exiting admin mode")
  }
})