const bcrypt = require("bcrypt");
const authRepository = require("../repositories/authRepository");
const AppError = require("../utils/AppError");

async function register(data) {

    const {
        username,
        password,
        faction
    } = data;

    const cleanUsername = username.trim();

    if (/\d/.test(cleanUsername)) {
        throw new AppError("INVALID_FORMAT", "Username cannot contain numbers", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const id = await authRepository.getNextUserId();

    const finalUsername = `${cleanUsername}${id}`;


    await authRepository.createUser({
        id,
        username: finalUsername,
        password: hashedPassword,
        faction
    });

    return {
        success: true,
        username: finalUsername,
        is_admin: false
    };

}

async function login({ body, session }) {

    const { username, password } = body;

    const user = await authRepository.findByUsername(username);

    if (!user) {
        throw new AppError("INVALID_CREDENTIAL", "Invalid Username and/or Password", 401);
    }

    const validPassword =
        await bcrypt.compare(password, user.password);

    if (!validPassword) {
        throw new AppError("INVALID_CREDENTIAL", "Invalid Username and/or Password", 401);
    }

    session.user = {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin,
        admin_active: false
    };

    return {
        success: true
    };

}

module.exports = {
    register,
    login
};