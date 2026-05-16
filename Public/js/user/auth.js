// TOGGLE BUTTONS

const loginContainer =
  document.getElementById("loginContainer")

const registerContainer =
  document.getElementById("registerContainer")

const loginReturnBtn =
  document.getElementById("loginReturnBtn")

const registerReturnBtn =
  document.getElementById("registerReturnBtn")

document
.getElementById("showLogin")
.addEventListener("click", () => {

  loginContainer.style.display = "block"

  registerContainer.style.display = "none"

})

document
.getElementById("showRegister")
.addEventListener("click", () => {

  loginContainer.style.display = "none"

  registerContainer.style.display = "block"

})


// REGISTER

const registerForm =
  document.getElementById("registerForm")

registerForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault()

    const username =
      document.getElementById(
        "registerUsername"
      ).value.trim()

    const password =
      document.getElementById(
        "registerPassword"
      ).value

    try {

      const response =
        await fetch("/auth/api/register", {

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

      if (data.success) {

        alert(
          `Account created!\n\nYour permanent username is:\n${data.username}`
        )

        registerForm.reset()

      } else {

        alert(
          data.message ||
          "Registration failed"
        )

      }

    } catch (err) {

      console.log(err)

      alert(
        "Server error"
      )

    }

})


// LOGIN

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
        await fetch("/auth/api/login", {

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

      if (data.success) {

        window.location.href =
          "/dashboard"

      } else {

        alert(data.message)

      }

    } catch (err) {

      console.log(err)

    }

})

loginReturnBtn.onclick = () => {
  window.location.href = "/home"
}

registerReturnBtn.onclick = () => {
  window.location.href = "/home"
}