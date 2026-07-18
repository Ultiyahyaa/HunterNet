const settingsService = require("../services/settingService");
const response = require("../utils/response");


async function changePassword(req, res, next) {

    try {

        const result = await settingsService.changePassword({
            username: req.session.user.username,
            currentPassword: req.body.currentPassword,
            newPassword: req.body.newPassword
        });


        res.json(result);

    } catch(err) {
        next(err)
    }
}



async function changeFaction(req, res, next){

    try {

        const result = await settingsService.changeFaction({
            username: req.session.user.username,
            newFaction: req.body.newFaction
        });

        res.json(result);

    } catch(err){
        next(err)
    }
}



module.exports = {

    changePassword,
    changeFaction

};