const pool = require("../config/database");

async function getUsers(){

    const result =
        await pool.query(
            `
            SELECT id, username, is_admin
            FROM users
            ORDER BY id ASC
            `
        );


    return result.rows;

}

async function deleteUser(id){

    await pool.query(

        `
        DELETE FROM users
        WHERE id=$1
        `,

        [id]

    );

}

async function getUserRole(id){

    const result =
        await pool.query(

            `
            SELECT is_admin
            FROM users
            WHERE id=$1
            `,

            [id]

        );


    return result.rows[0];

}



async function countAdmins(){

    const result =
        await pool.query(

            `
            SELECT COUNT(*)
            FROM users
            WHERE is_admin=true
            `

        );


    return parseInt(
        result.rows[0].count
    );

}



async function updateRole(id,isAdmin){

    await pool.query(

        `
        UPDATE users
        SET is_admin=$1
        WHERE id=$2
        `,

        [
            isAdmin,
            id
        ]

    );

}



module.exports = {

    getUsers,
    deleteUser,
    getUserRole,
    countAdmins,
    updateRole

};