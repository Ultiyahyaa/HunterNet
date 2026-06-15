function authRequired(req, res, next) {
  if (!req.session?.user) {
    const wantsJson = req.headers.accept?.includes("application/json") ||
      req.xhr ||
      req.path.includes("/api")

    if (wantsJson) {
      return res.status(401).json({ success: false, error: "Unauthorized" })
    }

    return res.redirect("/login")
  }

  next()
}

module.exports = authRequired