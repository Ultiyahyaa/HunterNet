const express = require("express")
const bcrypt = require("bcrypt")

const pool = require("../database/database")

const router = express.Router()

router.post("/api/register", async (req, res) => {

  const { username, password } = req.body

  try {

    const cleanUsername =
      username.trim()

    if (/\d/.test(cleanUsername)) {

      return res.status(400).json({

        success: false,
        message:
          "Username cannot contain numbers"

      })

    }

    const hashedPassword =
      await bcrypt.hash(password, 10)

    const idResult = await pool.query(

      `
      SELECT nextval(
        pg_get_serial_sequence(
          'users',
          'id'
        )
      ) AS id
      `

    )

    const id =
      idResult.rows[0].id

    const finalUsername =
      `${cleanUsername}${id}`

    await pool.query(

      `
      INSERT INTO users (
        id,
        username,
        password
      )
      VALUES ($1, $2, $3)
      `,

      [
        id,
        finalUsername,
        hashedPassword
      ]

    )
    
    res.json({

      success: true,
      username: finalUsername,
      is_admin: false

    })

  } catch (err) {

    console.log(err)

    if (err.code === "23505") {

      return res.status(400).json({

        success: false,
        message:
          "Username already exists"

      })

    }

    res.status(500).json({

      success: false,
      message:
        "Server error"

    })

  }

})

router.post("/api/login", async (req, res) => {

  const { username, password } = req.body

  try {

    const result = await pool.query("SELECT * FROM users WHERE username=$1", [username])
    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      })
    }

    const validPassword =
      await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      })
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      admin_active: false
    }

    res.json({
      success: true
    })

  } catch (err) {
    console.log(err)

    res.status(500).json({
      success: false
    })

  }

})

router.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {

    if (err) {
      return res.status(500).json({
        success: false
      })
    }

    res.clearCookie("connect.sid")

    res.json({
      success: true
    })
  })
})

router.get("/api/me", (req, res) => {

    if (!req.session.user) {

        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    res.json({
        username: req.session.user.username
    });
});

module.exports = router

