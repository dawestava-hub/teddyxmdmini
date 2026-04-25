const { cmd } = require('../inconnuboy');
const { updateUserConfig } = require('../lib/database');

// Helper function to update config in memory and database
const updateConfig = async (key, value, botNumber, config, reply) => {
    try {
        // 1. Update in-memory config (Immediate)
        config[key] = value;

        // 2. Update in Database (Persistent)
        const newConfig = {...config };
        newConfig[key] = value;

        await updateUserConfig(botNumber, newConfig);

        return reply(`*✅ ${key}* updated to: *${value}*\n\n*⚡ TEDDY-XMD*`);
    } catch (e) {
        console.error(e);
        return reply("*❌ Error saving to database*");
    }
};

// ============================================================
// 1. PRESENCE MANAGEMENT (Recording / Typing)
// ============================================================

cmd({
    pattern: "autorecording",
    alias: ["autorec", "arecording"],
    desc: "Enable/disable auto recording simulation",
    category: "settings",
    react: "🎙️",
    use: ".autorecording on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_RECORDING', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_RECORDING', 'false', botNumber, config, reply);
    } else {
        reply(
            `*🎙️ AUTO RECORDING*\n\n` +
            `*Current:* ${config.AUTO_RECORDING === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.autorecording on\n.autorecording off\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "customreact",
    alias: ["creact"],
    desc: "Enable/disable custom auto react to all messages",
    category: "settings",
    react: "✨",
    use: ".customreact on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");

    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('CUSTOM_REACT', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('CUSTOM_REACT', 'false', botNumber, config, reply);
    } else {
        reply(
            `*✨ CUSTOM REACT*\n\n` +
            `*Current:* ${config.CUSTOM_REACT === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.customreact on\n.customreact off\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "ownerreact",
    alias: ["oreact"],
    desc: "Enable/disable auto react to owner messages",
    category: "settings",
    react: "👑",
    use: ".ownerreact on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");

    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('OWNER_REACT', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('OWNER_REACT', 'false', botNumber, config, reply);
    } else {
        reply(
            `*👑 OWNER REACT*\n\n` +
            `*Current:* ${config.OWNER_REACT === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.ownerreact on\n.ownerreact off\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "autotyping",
    alias: ["autotype", "atyping"],
    desc: "Enable/disable auto typing simulation",
    category: "settings",
    react: "⌨️",
    use: ".autotyping on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_TYPING', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_TYPING', 'false', botNumber, config, reply);
    } else {
        reply(
            `*⌨️ AUTO TYPING*\n\n` +
            `*Current:* ${config.AUTO_TYPING === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.autotyping on\n.autotyping off\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "autovoice",
    alias: ["avoice", "autovn"],
    desc: "Enable/disable auto voice presence",
    category: "settings",
    react: "🔊",
    use: ".autovoice on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");

    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_VOICE', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_VOICE', 'false', botNumber, config, reply);
    } else {
        reply(
            `*🔊 AUTO VOICE*\n\n` +
            `*Current:* ${config.AUTO_VOICE === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.autovoice on\n.autovoice off\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "mentionreply",
    alias: ["mreply", "mentionon"],
    desc: "Enable/disable auto reply on mention",
    category: "settings",
    react: "💬",
    use: ".mentionreply on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");

    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('MENTION_REPLY', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('MENTION_REPLY', 'false', botNumber, config, reply);
    } else {
        reply(
            `*💬 MENTION REPLY*\n\n` +
            `*Current:* ${config.MENTION_REPLY === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.mentionreply on\n.mentionreply off\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

// ============================================================
// 2. CALL MANAGEMENT (Anti-Call)
// ============================================================

cmd({
    pattern: "anticall",
    alias: ["acall", "rejectcall"],
    desc: "Auto reject incoming calls",
    category: "settings",
    react: "📵",
    use: ".anticall on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('ANTI_CALL', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('ANTI_CALL', 'false', botNumber, config, reply);
    } else {
        reply(
            `*📵 ANTI-CALL*\n\n` +
            `*Current:* ${config.ANTI_CALL === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.anticall on\n.anticall off\n\n` +
            `_When ON, all incoming calls are auto-rejected_\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

// ============================================================
// 3. GROUP MANAGEMENT (Welcome / Goodbye)
// ============================================================

cmd({
    pattern: "welcome",
    desc: "Enable/disable welcome messages",
    category: "settings",
    react: "👋",
    use: ".welcome on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('WELCOME', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('WELCOME', 'false', botNumber, config, reply);
    } else {
        reply(
            `*👋 WELCOME MESSAGE*\n\n` +
            `*Current:* ${config.WELCOME === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.welcome on\n.welcome off\n\n` +
            `_Sends welcome message when new members join_\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "goodbye",
    desc: "Enable/disable goodbye messages",
    category: "settings",
    react: "👋",
    use: ".goodbye on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('GOODBYE', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('GOODBYE', 'false', botNumber, config, reply);
    } else {
        reply(
            `*👋 GOODBYE MESSAGE*\n\n` +
            `*Current:* ${config.GOODBYE === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.goodbye on\n.goodbye off\n\n` +
            `_Sends goodbye message when members leave_\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

// ============================================================
// 4. READ & STATUS MANAGEMENT
// ============================================================

cmd({
    pattern: "autoread",
    alias: ["readmessage", "bluetick"],
    desc: "Enable/disable auto read messages (Blue Tick)",
    category: "settings",
    react: "👀",
    use: ".autoread on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('READ_MESSAGE', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('READ_MESSAGE', 'false', botNumber, config, reply);
    } else {
        reply(
            `*👀 AUTO READ*\n\n` +
            `*Current:* ${config.READ_MESSAGE === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.autoread on\n.autoread off\n\n` +
            `_Auto-marks all messages as read_\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "autostatusview",
    alias: ["avs", "statusseen", "astatus"],
    desc: "Auto view status updates",
    category: "settings",
    react: "👁️",
    use: ".autostatusview on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_VIEW_STATUS', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_VIEW_STATUS', 'false', botNumber, config, reply);
    } else {
        reply(
            `*👁️ AUTO STATUS VIEW*\n\n` +
            `*Current:* ${config.AUTO_VIEW_STATUS === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.autostatusview on\n.autostatusview off\n\n` +
            `_Auto-views all status updates_\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "autolikestatus",
    alias: ["als", "statuslike"],
    desc: "Auto like status updates",
    category: "settings",
    react: "❤️",
    use: ".autolikestatus on/off"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_LIKE_STATUS', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_LIKE_STATUS', 'false', botNumber, config, reply);
    } else {
        reply(
            `*❤️ AUTO LIKE STATUS*\n\n` +
            `*Current:* ${config.AUTO_LIKE_STATUS === 'true'? "ON ✅" : "OFF ❌"}\n\n` +
            `*Usage:*\n.autolikestatus on\n.autolikestatus off\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

// ============================================================
// 5. SYSTEM (Mode & Prefix)
// ============================================================

cmd({
    pattern: "mode",
    desc: "Change bot mode (public/private/groups/inbox)",
    category: "settings",
    react: "⚙️",
    use: ".mode <public/private/groups/inbox>"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const mode = args[0]?.toLowerCase();
    const validModes = ['public', 'private', 'groups', 'inbox'];

    if (validModes.includes(mode)) {
        await updateConfig('WORK_TYPE', mode, botNumber, config, reply);
    } else {
        reply(
            `*⚙️ BOT MODE*\n\n` +
            `*Current:* ${config.WORK_TYPE}\n\n` +
            `*Valid modes:* ${validModes.join(', ')}\n\n` +
            `*Usage:*\n.mode public\n.mode private\n.mode groups\n.mode inbox\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});

cmd({
    pattern: "setprefix",
    alias: ["prefix"],
    desc: "Change bot prefix",
    category: "settings",
    react: "🔣",
    use: ".setprefix <symbol>"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*❌ This command is for owner only*");
    const newPrefix = args[0];

    if (newPrefix) {
        // Ensure prefix is short (single character or short string)
        if (newPrefix.length > 2 && newPrefix!== 'noprefix') {
            return reply("*❌ Prefix must be 1-2 characters*\n_Example:.! # /_");
        }

        await updateConfig('PREFIX', newPrefix, botNumber, config, reply);
    } else {
        reply(
            `*🔣 SET PREFIX*\n\n` +
            `*Current:* ${config.PREFIX}\n\n` +
            `*Usage:*\n.setprefix.\n.setprefix!\n.setprefix #\n\n` +
            `_Set the symbol used before commands_\n\n` +
            `*⚡ TEDDY-XMD*`
        );
    }
});