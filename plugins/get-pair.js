const { cmd, commands } = require('../inconnuboy');
const axios = require('axios');

cmd({
    pattern: "pair",
    alias: ["getpair", "clonebot", "code"],
    react: "🔗",
    desc: "Get pairing code for TEDDY-XMD bot",
    category: "main",
    use: ".pair 254700000000",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, senderNumber, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        let phoneNumber = q ? q.replace(/[^0-9]/g, '') : senderNumber.replace(/[^0-9]/g, '');

        // Convert numbers starting with 0 to international format
        if (phoneNumber.startsWith('0')) {
            phoneNumber = '254' + phoneNumber.substring(1); // Change 254 to your country code
        }

        if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return await reply(
                "*❌ Invalid phone number*\n\n" +
                "*Usage:* .pair 254700000000\n" +
                "*Note:* Use country code without + or spaces\n\n" +
                "*⚡ TEDDY-XMD*"
            );
        }

        const response = await axios.get(
            `https://teddyxmd1mini-1338329876db.herokuapp.com/code?number=${encodeURIComponent(phoneNumber)}`,
            { timeout: 15000 }
        );

        if (!response.data || !response.data.code) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return await reply("*❌ Failed to get pairing code. Server may be down*");
        }

        const pairingCode = response.data.code;

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        await reply(
            `*✅ TEDDY-XMD PAIRING CODE*\n\n` +
            `*📱 Number:* ${phoneNumber}\n` +
            `*🔑 Code:* \`${pairingCode}\`\n\n` +
            `*📋 Steps:*\n` +
            `1. Open WhatsApp > Linked Devices\n` +
            `2. Tap "Link with phone number"\n` +
            `3. Enter the code above\n\n` +
            `*⚠️ Code expires in 2 minutes*\n\n` +
            `*⚡ TEDDY-XMD*`
        );

        await new Promise(resolve => setTimeout(resolve, 1500));
        await reply(`\`${pairingCode}\``);

    } catch (error) {
        console.error("PAIR CMD ERROR:", error);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        await reply("*❌ Error getting pairing code. API might be offline*");
    }
});
