module.exports = (io) => {

    let onlineUsers = new Set();
    let userSessions = new Map();

    io.on("connection", (socket) => {

        socket.on("join:thread", (threadId) => {
            socket.join(`thread:${threadId}`);

        });

        socket.on("leave:thread", (threadId) => {
            socket.leave(`thread:${threadId}`);

        });

        socket.on("thread:message", (data) => {
            if (data.threadId && data.message) {
                io.to(`thread:${data.threadId}`)
                    .emit("thread:message:new", data.message);
            }
        });

        socket.on("user:online", (userData) => {
            onlineUsers.add(userData.username);
            userSessions.set(socket.id, userData);

            io.emit("user:joined", {
                onlineUsers: Array.from(onlineUsers)
            });
        });

        socket.on("disconnect", () => {
            const userData = userSessions.get(socket.id);
            if (userData) {
                onlineUsers.delete(userData.username);
                userSessions.delete(socket.id);

                io.emit("user:left", {
                    onlineUsers: Array.from(onlineUsers)
                });
            }

        });
    });

    io.threadEmit = (threadId, event, data) => {
        io.to(`thread:${threadId}`).emit(event, data);
    };
};

