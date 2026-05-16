require("dotenv").config()

const express = require("express")
const session = require("express-session")
const path = require("path")

const chatRoutes = require("./routes/chat")
const settingsRoutes = require("./routes/settings")
const roomRoutes = require("./routes/rooms")
const dmRoutes = require("./routes/dms");
const authRoutes = require("./routes/auth")
const adminRoutes = require("./routes/admin")
const threadsRoutes = require("./routes/threads")

const authRequired = require("./middleware/auth")
const adminOnly = require("./middleware/admin")
const app = express()

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

app.use(express.static(
  path.join(__dirname, "../public")
))

app.use("/", settingsRoutes)
app.use("/auth", authRoutes)
app.use("/admin", adminRoutes)
app.use("/chat", chatRoutes)
app.use("/rooms", roomRoutes)
app.use("/dm", dmRoutes)
app.use("/threads", threadsRoutes);

// PROTECTED ROUTES

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

app.listen(3000, () => {
  console.log(
    "Server running on port 3000"
  )
})