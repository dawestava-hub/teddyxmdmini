const { cmd, commands } = require('../inconnuboy');
const axios = require('axios');

cmd({
    pattern: "pair",
    alias: ["getpair", "clonebot"],
    react: "✅",
    desc: "Get pairing code for DR-MD MINI bot",
    category: "download",
    use: ".pair 923219300532",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, senderNumber, reply }) => {
    try {
        let phoneNumber = q ? q.replace(/[^0-9]/g, '') : senderNumber.replace(/[^0-9]/g, '');

        if (phoneNumber.startsWith('0')) {
            phoneNumber = '92' + phoneNumber.substring(1);
        }

        if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
            return await reply("❌ Please provide a valid phone number without `+`\nExample: `.pair 923219300532`");
        }

        const response = await axios.get(`https://dr-md-mini-718e84651b6f.herokuapp.com/code?number=${encodeURIComponent(phoneNumber)}`);

        if (!response.data || !response.data.code) {
            return await reply("❌ Failed to retrieve pairing code. Please try again later.");
        }

        const pairingCode = response.data.code;
        const doneMessage = "> *DR-MD MINI BOT PAIRING COMPLETED*";

        await reply(`${doneMessage}\n\n*Your pairing code is:* ${pairingCode}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        await reply(`${pairingCode}`);

    } catch (error) {
        console.error("Pair command error:", error);
        await reply("❌ An error occurred while getting pairing code. Please try again later.");
    }
});
          
