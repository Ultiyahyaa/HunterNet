const authService = require("../services/authService");
const response = require("../utils/response");

async function register(req, res, next) {

    try {

        const result = await authService.register(req.body);

        res.json(result);

    } catch (err) {
        next(err)
    }
}

async function login(req, res, next) {

    try {

        const result = await authService.login({
            body: req.body,
            session: req.session
        });

        res.json(result);

    } catch (err) {
        next(err)
    }
}

function logout(req, res, next) {

    req.session.destroy((err) => {

        if (err) {
            return next(err)
        }

        res.clearCookie("connect.sid");

        response.success(res);
    });
}

function me(req, res, next) {

    if (!req.session.user) {
        return response.error(res, "Not Authorized", 401);
    }

    res.json({
        id: req.session.user.id,
        username: req.session.user.username
    });
}

module.exports = {
    register,
    login,
    logout,
    me
};