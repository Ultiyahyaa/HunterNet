module.exports = (io) => {

    io.on("connection", (socket) => {

        /* =========================
        GLOBAL CHAT
        ========================= */

        socket.on("join:global", () => {
            socket.join("global");
        });

        /* =========================
        ROOMS
        ========================= */

        socket.on("join:room", (roomId) => {
            socket.join(`room:${roomId}`);
        });

        /* =========================
        DMS
        ========================= */

        socket.on("join:dm", (dmId) => {
            socket.join(`dm:${dmId}`);
            });
    });

    /* =========================
    EXPOSE SOCKETS
    ========================= */

    io.globalEmit = (event, data) => {
        io.to("global")
            .emit(event, data);
    };

    io.roomEmit = (room, event, data) => {
        io.to(room)
            .emit(event, data);
    };

    io.dmEmit = (dmId, event, data)=> {
        io.to(`dm:${dmId}`)
            .emit(event, data);
    };
};