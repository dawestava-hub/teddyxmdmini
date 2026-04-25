const { cmd } = require("../inconnuboy");
const config = require("../config");

cmd({
  pattern: "ping",
  alias: ["speed", "p", "latency"],
  react: "⚡",
  category: "info",
  desc: "Check bot response speed & uptime",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {

  try {
    const start = Date.now();
    await conn.sendPresenceUpdate("composing", from);
    const ping = Date.now() - start;

    const uptime = process.uptime();
    let hours = Math.floor(uptime / 3600);
    let minutes = Math.floor((uptime % 3600) / 60);
    let seconds = Math.floor(uptime % 60);

    const pingMsg = `*╭───〘 ⚡ STATUS 〙───*\n` +
    `*│⚡ Speed  : ${ping}ms*\n` +
    `*│⏱️ Uptime : ${hours}h ${minutes}m ${seconds}s*\n` +
    `*│🔰 Mode   : ${config.WORK_TYPE?.toUpperCase() || "PUBLIC"}*\n` +
    `*╰────────────────*\n\n` +
    `*⚡ TEDDY-XMD ACTIVE*`;

    await conn.sendMessage(from, {
      text: pingMsg,
      footer: "⚡ TEDDY-XMD Support",
      templateButtons: [
        {
          index: 1,
          urlButton: {
            displayText: "📢 Official Channel",
            url: "https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8"
          }
        },
        {
          index: 2,
          urlButton: {
            displayText: "💬 Support Group", 
            url: "https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8"
          }
        },
        {
          index: 3,
          urlButton: {
            displayText: "👑 Developer",
            url: "https://wa.me/254799963583" // Replace with your number
          }
        }
      ]
    }, { quoted: m });

  } catch (err) {
    console.log("❌ PING ERROR:", err);
    reply("*❌ Ping command failed*");
  }
});