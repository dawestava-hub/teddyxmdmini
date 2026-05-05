const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');

const config = require('./config');
const { commands } = require('./inconnuboy');
const { sms } = require('./lib/msg');
const {
    connectdb,
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    getUserConfigFromMongoDB,
    addNumberToMongoDB,
    getAllNumbersFromMongoDB,
    incrementStats,
    isSudo,
    isBanned,
    deleteSessionFromMongoDB
} = require('./lib/database');

const path = require('path');
const fs = require('fs-extra');
const pino = require('pino');
const express = require('express');
const cors = require('cors');

// Express app managed by index.js

global.prefix = config.PREFIX || '.';

connectdb().catch(e => console.log('⚠️ DB error:', e.message));

try { require('./telegram'); } catch (e) { console.log('Telegram disabled'); }

const activeSockets = new Map();
const reconnectAttempts = new Map();
const messageStore = new Map();

// ================= LOAD PLUGINS =================
const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js')).forEach(f => {
        try { require(path.join(pluginsDir, f)); }
        catch (e) { console.error(`Plugin ${f}:`, e.message); }
    });
}

// ================= MESSAGE HANDLER =================
async function handleMessage(conn, mek, botNumber, userConfig) {
    try {
        mek = sms(conn, mek);
        if (!mek.message || mek.key.remoteJid === 'status@broadcast' || mek.isBaileys) return;

        const from = mek.chat;
        const sender = mek.sender;
        const body = mek.body || '';
        const isGroup = mek.isGroup;
        const fromMe = mek.fromMe;
        const prefix = global.prefix;

        const senderNum = sender.replace(/[^0-9]/g, '');
        const ownerRaw = (config.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
        const isOwner = fromMe || senderNum === ownerRaw;
        const sudoAccess = !isOwner ? await isSudo(botNumber, senderNum).catch(() => false) : false;

        if (!isOwner && !sudoAccess) {
            const banned = await isBanned(botNumber, senderNum).catch(() => false);
            if (banned) return;
        }

        const workType = (userConfig.WORK_TYPE || config.WORK_TYPE || 'public').toLowerCase();
        if (workType === 'private' && !isOwner && !sudoAccess) return;
        if (workType === 'inbox' && isGroup) return;
        if (workType === 'group' && !isGroup) return;

        if (!body.startsWith(prefix)) return;

        const cmdText = body.slice(prefix.length).trim();
        const cmdName = cmdText.split(' ')[0].toLowerCase();
        const args = cmdText.split(' ').slice(1);
        const q = args.join(' ');

        const command = commands.find(c => {
            const patterns = [c.pattern, ...(c.alias || [])].map(p => p?.toLowerCase());
            return patterns.includes(cmdName);
        });

        if (!command) return;

        if (command.react) conn.sendMessage(from, { react: { text: command.react, key: mek.key } }).catch(() => {});
        incrementStats(botNumber, 'commandsUsed').catch(() => {});

        const reply = async (text) => conn.sendMessage(from, { text: String(text) }, { quoted: mek });

        await command.function(conn, mek, mek, {
            from, sender, isOwner, isSudo: isOwner || sudoAccess, args, q, reply, prefix,
            botNumber: botNumber.replace(/[^0-9]/g, ''), myquoted: mek, quoted: mek.quoted,
            config: userConfig, isGroup, fromMe,
            react: (emoji) => conn.sendMessage(from, { react: { text: emoji, key: mek.key } }).catch(() => {})
        });

    } catch (e) {
        console.error('❌ handleMessage:', e.message);
    }
}

// ================= START BOT =================
async function startBot(number, res = null, forceNew = false) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionDir = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

    try {
        if (forceNew) {
            await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
            if (fs.existsSync(sessionDir)) fs.removeSync(sessionDir);
            if (activeSockets.has(sanitizedNumber)) {
                try { activeSockets.get(sanitizedNumber).end(); } catch {}
                activeSockets.delete(sanitizedNumber);
            }
            reconnectAttempts.delete(sanitizedNumber);
        }

        if (!forceNew) {
            const existingSession = await getSessionFromMongoDB(sanitizedNumber).catch(() => null);
            if (existingSession) {
                fs.ensureDirSync(sessionDir);
                fs.writeFileSync(path.join(sessionDir, 'creds.json'), JSON.stringify(existingSession));
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const logger = pino({ level: 'silent' });

        const conn = makeWASocket({
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
            printQRInTerminal: false,
            logger: logger,
            browser: Browsers.macOS('Chrome'), // CRITICAL: Triggers WhatsApp push on alannxd fork
        });

        activeSockets.set(sanitizedNumber, conn);
        global.sock = conn;
        reconnectAttempts.set(sanitizedNumber, 0);

        if (res && forceNew) {
            await delay(2000);
            try {
                if (conn.authState.creds.registered) {
                    await conn.end();
                    if (!res.headersSent) return res.json({ error: 'Number already linked' });
                } else {
                    const code = await conn.requestPairingCode(sanitizedNumber);
                    await conn.end();
                    if (!res.headersSent) {
                        return res.json({ 
                            code: code.match(/.{1,4}/g)?.join('-') || code, 
                            number: sanitizedNumber
                        });
                    }
                }
            } catch (e) {
                await conn.end().catch(() => {});
                if (!res.headersSent) return res.status(500).json({ error: e.message });
            }
        }

        conn.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                const creds = JSON.parse(fs.readFileSync(path.join(sessionDir, 'creds.json'), 'utf-8'));
                saveSessionToMongoDB(sanitizedNumber, creds).catch(() => {});
            } catch {}
        });

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`✅ Connected: ${sanitizedNumber}`);
                reconnectAttempts.set(sanitizedNumber, 0);
                addNumberToMongoDB(sanitizedNumber).catch(() => {});
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                const attempts = reconnectAttempts.get(sanitizedNumber) || 0;

                if (code === DisconnectReason.loggedOut) {
                    activeSockets.delete(sanitizedNumber);
                    reconnectAttempts.delete(sanitizedNumber);
                    await deleteSessionFromMongoDB(sanitizedNumber).catch(() => {});
                    return;
                }

                if (attempts < 10) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempts), 30000);
                    reconnectAttempts.set(sanitizedNumber, attempts + 1);
                    setTimeout(() => startBot(number), delayMs);
                } else {
                    activeSockets.delete(sanitizedNumber);
                    reconnectAttempts.delete(sanitizedNumber);
                }
            }
        });

        conn.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            let userConfig = await getUserConfigFromMongoDB(sanitizedNumber).catch(() => ({}));
            for (const mek of messages) {
                handleMessage(conn, mek, sanitizedNumber, userConfig);
            }
        });

        return conn;

    } catch (err) {
        console.error('❌ startBot error:', err.message);
        if (res && !res.headersSent) res.json({ error: err.message });
        throw err;
    }
}

// ✅ Routes and server managed by index.js

module.exports = { startBot, activeSockets };
