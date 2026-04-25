const { cmd } = require('../inconnuboy');
const config = require('../config');

cmd({
  pattern: "autobio",
  alias: ["bioauto", "setautobio", "autostatus"],
  react: "🔄",
  category: "owner",
  desc: "Enable/disable auto bio with uptime",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, isOwner }) => {
  try {

    // 🔐 Owner only
    if (!isOwner) {
      return reply("*❌ This command is for owner only*");
    }

    const state = q?.toLowerCase();

    // ❓ Help / status
    if (!state || !["on", "off"].includes(state)) {
      return reply(
        `*🔄 AUTO BIO*\n\n` +
        `*Usage:*\n` +
        `• ${config.PREFIX}autobio on\n` +
        `• ${config.PREFIX}autobio off\n\n` +
        `*Current Status:* ${global.autoBio ? "ON ✅" : "OFF ❌"}\n\n` +
        `*⚡ TEDDY-XMD*`
      );
    }

    // ✅ Set state
    global.autoBio = state === "on";

    if (global.autoBio) {
      updateBio(conn);
      return reply("*✅ Auto bio enabled*\n_Bio will update every 1 minute_");
    } else {
      return reply("*❌ Auto bio disabled*");
    }

  } catch (e) {
    console.log("AUTOBIO ERROR:", e);
    reply("*❌ Failed to update auto bio*");
  }
});

// ================= BIO UPDATER =================
async function updateBio(conn) {
  if (!global.autoBio) return;

  try {
    const uptime = clockString(process.uptime() * 1000);
    const botname = config.BOT_NAME || "TEDDY-XMD";

    const bio = `⚡ ${botname} ACTIVE | ${uptime}`;
    await conn.updateProfileStatus(bio);

    console.log("✅ BIO UPDATED:", bio);
  } catch (err) {
    console.log("❌ BIO UPDATE FAILED:", err.message);
  }

  // ⏱️ 1 minute loop
  setTimeout(() => updateBio(conn), 60 * 1000);
}

// ================= TIME FORMAT =================
function clockString(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;

  let str = "";
  if (d) str += `${d}d `;
  if (h) str += `${h}h `;
  if (m) str += `${m}m `;
  if (s) str += `${s}s`;
  return str.trim();
}