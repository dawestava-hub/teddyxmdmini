const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path"); // Added to handle file paths

const app = express();

// ✅ Port (Heroku Compatible)
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ DISPLAY pair.html on the main link (/)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pair.html"));
});

// Router Load
const pairRouter = require("./inconnu");
app.use("/", pairRouter);

// ✅ Health Check Route (Very Important)
app.get("/ping", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Server running"
    });
});

// 🔥 Prevent Heroku Dyno Sleep Crash
setInterval(() => {}, 1000000);

// Server Start
app.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});

module.exports = app;
