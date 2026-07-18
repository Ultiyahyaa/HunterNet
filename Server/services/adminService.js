const adminRepository = require("../repositories/adminRepository");
const AppError = require("../utils/AppError");


async function getUsers(){
    return await adminRepository.getUsers();
}

async function deleteUser(data){

    const {
        targetId,
        requesterId
    } = data;


    if(parseInt(targetId) === requesterId){
        throw new AppError("INVALID_ACTION", "You cannot delete your own account", 400)
    }

    await adminRepository.deleteUser(targetId);
}

async function updateRole(data){

    const {
        targetId,
        requesterId,
        isAdmin
    } = data;


    if(parseInt(targetId) === requesterId && isAdmin === false){
        throw new AppError("INVALID_ACTION", "You cannot remove your own admin access", 400)
    }


    if(isAdmin === false){

        const target = await adminRepository.getUserRole(targetId);

        const count = await adminRepository.countAdmins();


        if(target?.is_admin && count <= 1){
            throw new AppError("INVALID_ACTION", "Cannot remove the last admin", 400)
        }
    }


    await adminRepository.updateRole(targetId, isAdmin);
}

module.exports = {
    getUsers,
    deleteUser,
    updateRole
};