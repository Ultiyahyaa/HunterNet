const response = require("../utils/response");

function authRequired(req, res, next) {
  if (!req.session?.user) {
    const wantsJson = req.headers.accept?.includes("application/json") ||
      req.xhr ||
      req.path.includes("/api")

    if (wantsJson) {
      return response.error(res, "Unauthorized", 403)
    }

    return res.redirect("/login")
  }

  next()
}

module.exports = authRequired