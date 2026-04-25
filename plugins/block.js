const { cmd } = require('../inconnuboy');

cmd({
  pattern: "block",
  alias: ["b", "blk", "ban"],
  react: "🚫",
  category: "owner",
  desc: "Block user by reply or in DM",
  filename: __filename
}, async (conn, mek, m, { from, reply, isOwner }) => {
  try {

    // 🔒 Owner only
    if (!isOwner) {
      return reply("*❌ This command is for owner only*");
    }

    let jid;

    // 📌 Reply case - block the quoted user
    if (m.quoted) {
      jid = m.quoted.sender;
    }
    // 📌 DM case - block the chat sender
    else if (from.endsWith("@s.whatsapp.net")) {
      jid = from;
    } 
    else {
      return reply(
        "*ℹ️ How to use:*\n" +
        "Reply to a user's message with .block\n" +
        "Or use .block in their DM\n\n" +
        "*⚡ TEDDY-XMD*"
      );
    }

    // Message before block
    await reply("*🚫 You have been blocked by TEDDY-XMD owner*");

    // ⏱️ Small delay then block
    setTimeout(async () => {
      await conn.updateBlockStatus(jid, "block");
      await conn.sendMessage(from, { react: { text: "✅", key: mek.key }});
    }, 1500);

  } catch (e) {
    console.log("BLOCK ERROR:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
    reply("*❌ Failed to block user*");
  }
});