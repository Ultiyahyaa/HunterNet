const adminService = require("../services/adminService");
const response = require("../utils/response");


async function getUsers(req, res, next){

    try {

        const users = await adminService.getUsers();

        response.success(res, users);

    } catch(err){
        next(err)
    }
}



async function deleteUser(req, res, next){

    try {

        await adminService.deleteUser({
            targetId: req.params.id,
            requesterId: req.session.user.id

        });

        response.success(res);

    } catch(err) {
        next(err)
    }
}



async function updateRole(req, res, next){

    try {

        await adminService.updateRole({
            targetId:req.params.id,
            isAdmin:req.body.is_admin,
            requesterId:req.session.user.id
        });

        response.success(res);

    } catch(err){
        next(err)
    }
}

function adminLogin(req, res, next){
    req.session.user.admin_active = true;

    response.success(res);
}



function adminLogout(req, res, next){
    req.session.user.admin_active = false;

    response.success(res);
}


module.exports = {
    getUsers,
    deleteUser,
    updateRole,
    adminLogin,
    adminLogout
};