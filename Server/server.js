require("dotenv").config()

const express = require("express")
const session = require("express-session")
const path = require("path")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app);
const io =
    new Server(server, {

        cors: {
            origin: true,
            credentials: true
        }
    });

const chatSockets = require("./sockets/chatSockets")
const chatRoutes = require("./routes/chat")(io);
const settingsRoutes = require("./routes/settings")
const roomRoutes = require("./routes/rooms")(io)
const dmRoutes = require("./routes/dms")(io);
const authRoutes = require("./routes/auth")
const adminRoutes = require("./routes/admin")
const threadsRoutes = require("./routes/threads")

const authRequired = require("./middleware/auth")
const adminOnly = require("./middleware/admin")

chatSockets(io);

app.set("io", io);

app.use(express.json())

app.use(express.urlencoded({
  extended: true
}))

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true
  }
}))

/* =========================
SOCKET CONNECTIONS
========================= */

/* =========================
ROUTES
========================= */

app.use(express.static(
  path.join(__dirname, "../public")
))

app.use("/", settingsRoutes)
app.use("/auth", authRoutes)
app.use("/admin", adminRoutes)
app.use("/chat/api/rooms", roomRoutes)
app.use("/chat/api/dms", dmRoutes)
app.use("/chat", chatRoutes);
app.use("/threads", threadsRoutes);

/* =========================
PROTECTED ROUTES
========================= */

app.get("/home", (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/index.html")
    )
})

app.get("/login", (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/private/user/auth.html")
    )
})

app.get("/dashboard", authRequired,(req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/private/user/dashboard.html")
    )
})

app.get("/chat", authRequired, (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/private/user/chat.html")
    )
})

app.get("/settings", authRequired, (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/private/user/settings.html")
    )
})

app.get("/boards", authRequired, (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/private/user/threads.html")
    )
})

app.get("/adminLogin", authRequired, (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/private/admin/auth.html")
    )
})

app.use("/admin", adminOnly, express.static(
    path.join(__dirname, "../Public/private/admin"),
    {
      extensions: ["html"],
      index: "dashboard.html"
    }
  )
)

server.listen(3000, () => {

    console.log(
        "HunterNet running on 3000"
    );
});