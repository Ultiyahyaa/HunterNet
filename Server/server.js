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
const threadSockets = require("./sockets/threadSockets")

const authRoutes = require("./routes/authRoutes")
const chatRoutes = require("./routes/chatRoutes")(io);
const roomRoutes = require("./routes/roomRoutes")(io)
const dmRoutes = require("./routes/dmRoutes")(io);
const threadsRoutes = require("./routes/threadRoutes")(io)
const settingsRoutes = require("./routes/settingRoutes")
const adminRoutes = require("./routes/adminRoutes")

const authRequired = require("./middleware/authRequired")
const adminOnly = require("./middleware/adminOnly")
const errorHandler = require("./middleware/errorHandler");

chatSockets(io);
threadSockets(io);

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
ROUTES
========================= */

app.use(express.static(
  path.join(__dirname, "../public")
))

app.use("/settings/api", settingsRoutes)
app.use("/auth/api", authRoutes)
app.use("/admin/api", adminRoutes)
app.use("/chat/api/rooms", roomRoutes)
app.use("/chat/api/dms", dmRoutes)
app.use("/chat/api", chatRoutes);
app.use("/threads/api", threadsRoutes);

app.use(errorHandler);


app.get(["/", "/home", "/articles", "/privacy", "/leaks", "/about"],
    (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../Public/pages/public/index.html"
        )
    );

});

app.get("/login", (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/pages/private/user/auth.html")
    )
})

/* =========================
PROTECTED ROUTES
========================= */

app.use("/", authRequired, express.static(
    path.join(__dirname, "../Public/pages/private/user"),
    {
        extensions: ["html"]
    })
);

app.get("/adminLogin", authRequired, (req, res) => {
    res.sendFile(
      path.join(__dirname, "../Public/pages/private/admin/auth.html")
    )
})

app.use("/admin", adminOnly, express.static(
    path.join(__dirname, "../Public/pages/private/admin"),
    {
        extensions: ["html"],
        index: "dashboard.html"
    })
)

app.use((req, res) => {

    if (req.session?.user) {

        return res.status(404).sendFile(
            path.join(
                __dirname,
                "../Public/pages/private/user/hunternet404.html"
            )
        );
    }

    return res.status(404).sendFile(
        path.join(
            __dirname,
            "../Public/pages/public/404.html"
        )
    );

});

server.listen(3000, () => {

    console.log(
        "\nHunterNet running on Port 3000\n" +
        "Open ngrok and type 'ngrok http 3000' to Host public.\n"
    );
});