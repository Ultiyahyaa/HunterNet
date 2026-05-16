const loginForm =
  document.getElementById("loginForm")

loginForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault()

    const username =
      document.getElementById(
        "loginUsername"
      ).value

    const password =
      document.getElementById(
        "loginPassword"
      ).value

    try {

      const response =
        await fetch("/admin/api/login", {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            username,
            password
          })

        })

      const data =
        await response.json()

      if (!data.success) {

        alert(
          data.message ||
          "Login failed"
        )

        return
      }

      const adminRes =
        await fetch("/admin/api/users")

      if (adminRes.status === 401 || adminRes.status === 403) {

        alert(
          "You do not have admin permissions"
        )

        return
      }

      // SUCCESS
      loginForm.reset()

      window.location.href =
        "/admin"

    } catch (err) {

      console.log(err)

      alert("Server error")

    }

})