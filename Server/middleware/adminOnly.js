const response = require("../utils/response");

function adminOnly(req, res, next) {
  if (!req.session.user) {
    return response.error(res, "Not logged in", 401)

  }

  if (req.session.user.is_admin !== true) {
    return response.error(res, "Admin access required", 403)

  }

  if (req.session.user.admin_active !== true) {
    return response.error(res, "Admin mode inactive", 403)
    
  }

  next()
}

module.exports = adminOnly