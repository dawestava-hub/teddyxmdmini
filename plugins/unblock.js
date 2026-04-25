const { cmd } = require('../inconnuboy');

cmd({
  pattern: "unblock",
  alias: ["unb", "unblk", "unblok"],
  react: "✅",
  category: "owner",
  desc: "Unblock a user via reply or inbox",
  filename: __filename
}, async (conn, mek, m, { from, reply, isOwner }) => {
  try {

    // 🔒 Owner only
    if (!isOwner) {
      return reply("*❌ This command is for owner only*");
    }

    let jid;

    // 📌 Reply case
    if (m.quoted) {
      jid = m.quoted.sender;
    }
    // 📌 Private chat case
    else if (from.endsWith("@s.whatsapp.net")) {
      jid = from;
    } 
    else {
      return reply("*ℹ️ Reply to a user's message or use this command in private chat to unblock*");
    }

    await conn.updateBlockStatus(jid, "unblock");

    await conn.sendMessage(from, {
      react: { text: "✅", key: mek.key }
    });

    reply(`*✅ Successfully unblocked* @${jid.split('@')[0]}`, { mentions: [jid] });

  } catch (e) {
    console.log("UNBLOCK ERROR:", e);
    reply("*❌ Failed to unblock user. Make sure the user exists*");
  }
});