module.exports = (io) => {

    let onlineUsers = new Set();
    let userSessions = new Map();

    io.on("connection", (socket) => {

        console.log("Thread socket connected:", socket.id);

        const userId = socket.handshake.auth?.userId || socket.id;

        socket.on("join:thread", (threadId) => {
            socket.join(`thread:${threadId}`);
            console.log(`User joined thread ${threadId}`);
        });

        socket.on("leave:thread", (threadId) => {
            socket.leave(`thread:${threadId}`);
            console.log(`User left thread ${threadId}`);
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

            console.log("Thread socket disconnected:", socket.id);
        });
    });

    io.threadEmit = (threadId, event, data) => {
        io.to(`thread:${threadId}`).emit(event, data);
    };
};

