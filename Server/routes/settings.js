const express = require("express")
const bcrypt = require("bcrypt")
const pool = require("../database/database")
const authRequired = require("../middleware/auth")

const router = express.Router()

router.post("/api/changePassword", authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body

  const username = req.session.user.username

  try {
    const result = await pool.query(
      "SELECT password FROM users WHERE username=$1",
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false })
    }

    const valid = await bcrypt.compare(
      currentPassword,
      result.rows[0].password
    )

    if (!valid) {
      return res.status(401).json({ success: false, message: "Wrong password" })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await pool.query(
      "UPDATE users SET password=$1 WHERE username=$2",
      [hashedPassword, username]
    )

    res.json({ success: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false })
  }
})

router.post("/api/changeFaction", authRequired, async (req, res) => {
  const { newFaction } = req.body

  const username = req.session.user.username

  try {
    await pool.query(
        "UPDATE users SET faction=$1 WHERE username=$2",
        [newFaction, username]
    )

    res.json({ success: true })

  } catch (err){
    console.log(err)
    res.status(500).json({ success: false })
  }
})

module.exports = router