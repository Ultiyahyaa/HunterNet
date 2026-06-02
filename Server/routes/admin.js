const express = require("express")
const router = express.Router()
const pool = require("../database/database")
  const adminOnly = require("../middleware/admin")

// Get all users (admin dashboard)
router.get("/api/users", adminOnly, async (req, res) => {

  try {

    const result =
      await pool.query(
        "SELECT id, username, is_admin FROM users ORDER BY id ASC"
      )

    res.json({
      success: true,
      users: result.rows
    })

  } catch (err) {

    console.log(err)

    res.status(500).json({
      success: false
    })

  }

})

// Delete a user
router.delete("/api/user/:id", adminOnly, async (req, res) => {
  const { id } = req.params

  try {
    // prevent self-delete
    if (parseInt(id) === req.session.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account"
      })
    }

    await pool.query(
      "DELETE FROM users WHERE id = $1",
      [id]
    )

    res.json({ success: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false })
  }
})

router.patch(
  "/api/user/:id/role",
  adminOnly,
  async (req, res) => {

    const { id } = req.params
    const { is_admin } = req.body

    try {

      // prevent self-demotion
      if (
        parseInt(id) === req.session.user.id &&
        is_admin === false
      ) {

        return res.status(400).json({
          success: false,
          message:
            "You cannot remove your own admin access"
        })

      }

      // prevent removing last admin
      if (is_admin === false) {

        const adminCount =
          await pool.query(
            `
            SELECT COUNT(*)
            FROM users
            WHERE is_admin = true
            `
          )

        const target =
          await pool.query(
            `
            SELECT is_admin
            FROM users
            WHERE id = $1
            `,
            [id]
          )

        if (
          target.rows[0]?.is_admin &&
          parseInt(adminCount.rows[0].count) <= 1
        ) {

          return res.status(400).json({
            success: false,
            message:
              "Cannot remove the last admin"
          })

        }

      }

      await pool.query(
        `
        UPDATE users
        SET is_admin = $1
        WHERE id = $2
        `,
        [is_admin, id]
      )

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

router.post("/api/login", (req, res) => {
  if (!req.session.user?.is_admin) {
    return res.status(403).json({ success: false })
  }

  req.session.user.admin_active = true

  res.json({ success: true })
})

router.post("/api/logout", (req, res) => {
  try {
    if (req.session && req.session.user) {
      req.session.user.admin_active = false
    }

    return res.json({
      success: true
    })

  } catch (err) {
    console.log("ADMIN LOGOUT ERROR:", err)

    return res.status(500).json({
      success: false,
      message: "Server error"
    })
  }
})

module.exports = router