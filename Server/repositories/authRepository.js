const pool = require("../config/database");

async function getNextUserId() {

    const result = await pool.query(`
        SELECT nextval(
            pg_get_serial_sequence(
                'users',
                'id'
            )
        ) AS id
    `);

    return result.rows[0].id;

}

async function createUser(user) {

    await pool.query(
        `
        INSERT INTO users
        (
            id,
            username,
            password,
            faction
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4
        )
        `,
        [
            user.id,
            user.username,
            user.password,
            user.faction
        ]
    );

}

async function findByUsername(username) {

    const result = await pool.query(

        `
        SELECT *
        FROM users
        WHERE username = $1
        `,
        [username]

    );

    return result.rows[0];

}

module.exports = {

    getNextUserId,
    createUser,
    findByUsername

};
