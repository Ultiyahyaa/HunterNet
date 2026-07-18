const bcrypt = require("bcrypt");
const settingsRepository = require("../repositories/settingRepository");
const AppError = require("../utils/AppError");


async function changePassword(data){

    const {
        username,
        currentPassword,
        newPassword
    } = data;

    const user = await settingsRepository.findPassword(username);

    if(!user){

        throw new AppError("USER_NOT_FOUND", "User Not Found", 404);
    }



    const valid =
        await bcrypt.compare(
            currentPassword,
            user.password
        );


    if(!valid){

        throw new AppError("INVALID_CREDENTIALS", "Invalid Username and/or Password", 404);
    }



    const hashedPassword =
        await bcrypt.hash(newPassword,10);



    await settingsRepository.updatePassword(
        username,
        hashedPassword
    );



    return {
        success:true
    };

}

async function changeFaction(data){

    await settingsRepository.updateFaction(

        data.username,
        data.newFaction

    );


    return {
        success:true
    };

}


module.exports = {
    changePassword,
    changeFaction
};