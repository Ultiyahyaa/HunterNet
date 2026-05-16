function adminOnly(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in" })

  }

  if (req.session.user.is_admin !== true) {
    return res.status(403).json({ message: "Admin access required" })

  }

  if (req.session.user.admin_active !== true) {
    return res.status(403).json({ message: "Admin mode not active" })
    
  }

  next()
}

module.exports = adminOnly