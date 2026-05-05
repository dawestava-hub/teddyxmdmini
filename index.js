const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

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

// ✅ Start bot logic (no double server)
const { startBot, activeSockets } = require("./inconnu");

// ✅ Pair route
app.get("/pair", async (req, res) => {
    let number = req.query.number;
    if (!number) return res.status(400).json({ error: "Number required" });
    number = number.replace(/[^0-9]/g, "");
    if (number.length < 11) return res.status(400).json({ error: "Use 254712345678 format" });
    try {
        await startBot(number, res, true);
    } catch (e) {
        if (!res.headersSent) res.status(500).json({ error: e.message });
    }
});

// ✅ Health Check Route
app.get("/ping", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Server running",
        activeBots: activeSockets.size
    });
});

// 🔥 Prevent Dyno Sleep
setInterval(() => {}, 1000000);

// Server Start
app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 Server running on port", PORT);
});

module.exports = app;
