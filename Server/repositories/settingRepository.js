const pool = require("../config/database");

async function findPassword(username){

    const result =
        await pool.query(

            `
            SELECT password
            FROM users
            WHERE username=$1
            `,

            [username]

        );


    return result.rows[0];

}



async function updatePassword(username,password){

    await pool.query(

        `
        UPDATE users
        SET password=$1
        WHERE username=$2
        `,

        [
            password,
            username
        ]

    );

}



async function updateFaction(username,faction){

    await pool.query(

        `
        UPDATE users
        SET faction=$1
        WHERE username=$2
        `,

        [
            faction,
            username
        ]

    );

}



module.exports = {

    findPassword,
    updatePassword,
    updateFaction

};