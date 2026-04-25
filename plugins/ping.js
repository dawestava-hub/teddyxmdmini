const { cmd } = require("../inconnuboy");
const config = require("../config");

cmd({
  pattern: "ping",
  alias: ["speed", "p"],
  react: "⚡",
  category: "info",
  desc: "Check bot ping status",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {

  try {
    const start = Date.now();

    // Dummy composing update
    await conn.sendPresenceUpdate("composing", from);

    const ping = Date.now() - start;

    const uptime = process.uptime();
    let hours = Math.floor(uptime / 3600);
    let minutes = Math.floor((uptime % 3600) / 60);
    let seconds = Math.floor(uptime % 60);

    const pingMsg = `
*╔══〘 ⚡ PING STATUS ⚡ 〙══╗*
*║⚡ BOT SPEED : ${ping} MS*
*║⚡ UPTIME    : ${hours}H ${minutes}M ${seconds}S*
*║⚡ MODE      : ${config.WORK_TYPE?.toUpperCase() || "PUBLIC"}*
*╚══════════════════════╝*

👑 *KAMRAN-MD BOT ACTIVE* 👑
`;

    // Send Ping Reply
    await conn.sendMessage(from, {
      text: pingMsg,
      footer: "👑 KAMRAN MD Support",
      templateButtons: [
        {
          index: 1,
          urlButton: {
            displayText: "📢 Channel 1",
            url: "https://whatsapp.com/channel/0029VbAhxYY90x2vgwhXJV3O"
          }
        },
        {
          index: 2,
          urlButton: {
            displayText: "📢 Channel 2",
            url: "https://whatsapp.com/channel/0029VbAhxYY90x2vgwhXJV3O"
          }
        },
        {
          index: 3,
          urlButton: {
            displayText: "💬 Support Group",
            url: "https://chat.whatsapp.com/HiOa8f0G7yHHGjZBUv4iA6?mode=gi_t"
          }
        }
      ]
    }, { quoted: m });

  } catch (err) {
    console.log("❌ PING ERROR:", err);
    reply("❌ Ping command error aa gaya!");
  }
});
