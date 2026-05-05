const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

module.exports = {
    // ===========================================================
    // 1. BASE CONFIGURATION
    // ===========================================================
    SESSION_ID: process.env.SESSION_ID || "TEDDY-XMD",
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://sana:jawadsaan@cluster0.39ezrfs.mongodb.net/?appName=Cluster0',

    // ===========================================================
    // 2. BOT INFORMATION
    // ===========================================================
    PREFIX: process.env.PREFIX || '.',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '+254799963583',
    OWNER_NAME: process.env.OWNER_NAME || 'Teddy',
    BOT_NAME: "TEDDY-XMD",
    BOT_FOOTER: '⚡ Powered by TEDDY-XMD',
    WORK_TYPE: process.env.WORK_TYPE || "public",

    // ===========================================================
    // 3. AUTO FEATURES
    // ===========================================================
    AUTO_VIEW_STATUS: process.env.AUTO_VIEW_STATUS || 'true',
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS || 'true',
    AUTO_LIKE_EMOJI: ['❤️', '🌹', '✨', '🥰', '😍', '💞', '💕', '☺️', '🤗'],
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || 'true',
    AUTO_REACT_STATUS: process.env.AUTO_REACT_STATUS || 'true',
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || 'false',
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || '🤗',

    // ===========================================================
    // 4. CHAT & PRESENCE
    // ===========================================================
    READ_MESSAGE: process.env.READ_MESSAGE || 'false',
    AUTO_TYPING: process.env.AUTO_TYPING || 'false',
    AUTO_RECORDING: process.env.AUTO_RECORDING || 'false',

    // ===========================================================
    // 5. GROUP MANAGEMENT
    // ===========================================================
    WELCOME_ENABLE: process.env.WELCOME_ENABLE || 'true',
    GOODBYE_ENABLE: process.env.GOODBYE_ENABLE || 'true',
    WELCOME_MSG: process.env.WELCOME_MSG || null,
    GOODBYE_MSG: process.env.GOODBYE_MSG || null,
    WELCOME_IMAGE: process.env.WELCOME_IMAGE || null,
    GOODBYE_IMAGE: process.env.GOODBYE_IMAGE || null,
    GROUP_INVITE_LINK: process.env.GROUP_INVITE_LINK || 'https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8',
    GROUP_LINK: process.env.GROUP_LINK || 'https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8',

    // ===========================================================
    // 6. SECURITY & ANTI-FEATURES
    // ===========================================================
    ANTI_CALL: process.env.ANTI_CALL || 'true',
    REJECT_MSG: process.env.REJECT_MSG || '*📵 TEDDY-XMD doesn\'t accept calls*',
    ANTI_DELETE: process.env.ANTI_DELETE || 'true',

    // ===========================================================
    // 7. IMAGES & LINKS
    // ===========================================================
    IMAGE_PATH: 'https://files.catbox.moe/13nyhx.jpg',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbBXuGe4yltMLngL582d',
    WEB_PAIR_URL: 'https://teddyxmd1mini-1338329876db.herokuapp.com/',

    // ===========================================================
    // 8. AUTO JOIN SETTINGS
    // ===========================================================
    NEWSLETTER_JID: process.env.NEWSLETTER_JID || '120363421104812135@newsletter',
    AUTO_JOIN_GROUP: process.env.AUTO_JOIN_GROUP || 'https://chat.whatsapp.com/CLClgqJIC59GrcI4sRzLu8',

    // ===========================================================
    // 9. AUTO REACT SETTINGS
    // ===========================================================
    AUTO_REACT_NUMBERS: process.env.AUTO_REACT_NUMBERS || '254799963583',
    AUTO_REACT_EMOJIS: process.env.AUTO_REACT_EMOJIS || '❤️,🔥,💯,👑,⚡',
    CHANNEL_REACT: process.env.CHANNEL_REACT || 'true',
    CHANNEL_REACT_EMOJIS: process.env.CHANNEL_REACT_EMOJIS || '❤️,👍,🔥,💯,🙏,⚡',

    // ===========================================================
    // 10. TELEGRAM BOT - GET NEW TOKEN FROM @BotFather
    // ===========================================================
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8628995376:AAEfaPuN7cWZPXZh3jDfNgpLgS3R6t1lbCc',
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'xdbot1',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '6636269371'
};
