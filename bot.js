try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed or environment variables already set
}
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql2/promise');

const lastMessages = new Map();

const bot = new TelegramBot(process.env.BOT_TOKEN);
const botTokenStr = process.env.BOT_TOKEN || '';

const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || '8731737556:AAFOphwlw36DT9DXncUpRmVqlPh7JBDEnvw';
const adminBot = new TelegramBot(ADMIN_BOT_TOKEN);

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'paxyocom_newChapa',
    password: process.env.DB_PASS || 'UM+A*jovWX0P{GG1',
    database: process.env.DB_NAME || 'paxyocom_paxyov3',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const userChatIds = new Map();
const sentMessageIds = new Map();

const loadUserChatIds = async () => {
    try {
        const [rows] = await pool.execute('SELECT tg_id, first_name FROM auth');
        rows.forEach((row) => {
            if (row.tg_id) userChatIds.set(row.tg_id.toString(), row.first_name || 'user');
        });
        console.log(`Loaded ${rows.length} user chat IDs from MySQL.`);
    } catch (error) {
        console.error('Failed to load user chat IDs from MySQL:', error);
    }
};

const createAuthUrl = (user) => {
    const userData = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || "",
        username: user.username || "",
        language_code: user.language_code || "en"
    };
    const userJson = JSON.stringify(userData);
    const authDate = Math.floor(Date.now() / 1000);
    const dataString = `user=${encodeURIComponent(userJson)}&auth_date=${authDate}`;
    return `https://paxyo.com/telegram_auth.php?tg_data=${encodeURIComponent(dataString)}`;
};

const saveUserChatId = async (user) => {
    try {
        const tgId = user.id.toString();
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const username = user.username || '';

        const [result] = await pool.execute(
            `INSERT INTO auth (tg_id, first_name, last_name, username, created_at, last_seen) 
             VALUES (?, ?, ?, ?, NOW(), NOW()) 
             ON DUPLICATE KEY UPDATE last_seen = NOW(), first_name = VALUES(first_name), last_name = VALUES(last_name), username = VALUES(username)`,
            [tgId, firstName, lastName, username]
        );

        userChatIds.set(tgId, firstName || 'user');
        console.log(`User ${tgId} saved/updated in MySQL.`);

        // affectedRows === 1 means MySQL inserted a BRAND NEW record
        if (result && result.affectedRows === 1) {
            console.log(`[saveUserChatId] New user registered: ${firstName} (${tgId})`);
            const userIds = [5928771903, 779060335, 460529558];
            const msgText = `👤 New User: ${firstName || 'User'} (${tgId}) (${username ? '@' + username : 'No username'})`;
            for (const userId of userIds) {
                await adminBot.sendMessage(userId, msgText, { parse_mode: 'HTML' }).catch(() => {});
            }
        }
    } catch (error) {
        console.error(`Failed to save user ${user.id} to MySQL:`, error.message);
    }
};

loadUserChatIds();

const saveBotUsername = async () => {
    try {
        const me = await bot.getMe();
        const botUsername = me.username;
        console.log(`Resolved bot username on startup: @${botUsername}`);
        await pool.execute(
            "INSERT INTO settings (setting_key, setting_value) VALUES ('bot_username', ?) " +
            "ON DUPLICATE KEY UPDATE setting_value = ?",
            [botUsername, botUsername]
        );
        console.log(`Bot username saved to settings database.`);
    } catch (e) {
        console.error('Failed to save bot username to settings DB:', e.message);
    }
};
saveBotUsername();

const checkUserPhone = async (tgId) => {
    try {
        const response = await axios.get(`https://paxyo.com/api_check_phone.php?tg_id=${tgId}`);
        return response.data.has_phone === true;
    } catch (error) {
        console.error('Error checking phone:', error.message);
        return true;
    }
};

const saveUserPhone = async (tgId, phone) => {
    try {
        await axios.post('https://paxyo.com/api_save_phone.php', {
            tg_id: tgId,
            phone_number: phone
        });
        console.log(`Phone saved for ${tgId}: ${phone}`);
        return true;
    } catch (error) {
        console.error('Error saving phone:', error.message);
        return false;
    }
};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    const user = msg.from;
    console.log(`New user started bot: ${username || 'Unknown'} (Chat ID: ${chatId})`);

    saveUserChatId(user).catch(err => console.error('BG Save Error:', err));

    const hasPhone = await checkUserPhone(chatId);

    if (!hasPhone) {
        const welcomeReqText = `👋 <b>Hey, welcome aboard ${firstName || 'friend'}!</b> 🇪🇹\n\n` +
            `📱 <i>(Optional)</i> Please share your phone number to enable direct support:`;

        await bot.sendMessage(chatId, welcomeReqText, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [[
                    { text: '📱 Share Phone Number', request_contact: true }
                ], [
                    { text: '⏭️ Skip for now' }
                ]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }

    try {
        const welcomeText = ` <b>👋 Welcome to Ziviop!</b> \n\n` +
            `Grow your social media faster with high-quality, affordable services🚀\n\n` +
            `Choose a service, place your order, and watch your account grow automatically. Thanks for choosing Ziviop!`;

        await bot.sendPhoto(chatId, 'https://i.ibb.co/zWfzvDCY/n.jpg', {
            caption: welcomeText,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Start App',
                            web_app: { url: 'https://abiyclient34.onrender.com/' }
                        }
                    ]
                ]
            }
        });

        console.log(`Single welcome message with all buttons sent to ${chatId}`);
    } catch (error) {
        console.error(`Failed to send welcome message to ${chatId}:`, error.message);
        await bot.sendMessage(chatId, `👋 Welcome! Launch App here:`, {
            reply_markup: {
                inline_keyboard: [[{ text: '🦾 Open App', web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' } }]]
            }
        }).catch(e => console.error('Fallback fail:', e.message));
    }
});

bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;

    if (contact.user_id === msg.from.id) {
        const phone = contact.phone_number;
        console.log(`Phone received from ${chatId}: ${phone}`);

        await saveUserPhone(chatId, phone);

        await bot.sendMessage(chatId, "✅ <b>Phone number saved!</b>\n\nThank you for sharing your contact. Our support team can now reach you directly if needed.", {
            parse_mode: 'HTML',
            reply_markup: { remove_keyboard: true }
        });

        await bot.sendMessage(chatId, "🚀 Ready to explore? Launch the app below!", {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: '🦾 Launch SMM App', web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' } }
                ]]
            }
        });
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.from && !userChatIds.has(msg.from.id.toString())) {
        saveUserChatId(msg.from).catch(err => console.error('BG Save Error:', err));
    }

    if (msg.text === '⏭️ Skip for now') {
        await bot.sendMessage(chatId, "No problem! You can share your phone later.\n\n🚀 Launch the app to get started:", {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: '🦾 Launch SMM App', web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' } }
                ]]
            }
        });

        await bot.sendMessage(chatId, ".", {
            reply_markup: { remove_keyboard: true }
        }).then(sentMsg => {
            bot.deleteMessage(chatId, sentMsg.message_id).catch(() => { });
        });
    }
});

bot.on('callback_query', async (query) => {
    if (query.data === 'how_to_order') {
        await bot.sendMessage(query.message.chat.id,
            'Watch this video to learn how to order:\n[How to order video](https://paxyo.com/mmmm.mp4)',
            { parse_mode: 'Markdown' }
        );
        await bot.answerCallbackQuery(query.id);
    }
});

const sendTelegramMessage = async (chatId, text, imageUrl, type, amount, uid, tid) => {
    try {
        if (imageUrl && amount == null && uid == null) {
            const response = await bot.sendPhoto(chatId, imageUrl, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '🦾 Open App',
                                web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' }
                            }
                        ]
                    ]
                }
            });
            return response.message_id;
        } else {
            if (type == null && amount == null && uid == null && tid == null) {
                const response = await bot.sendMessage(chatId, text, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '🦾 Open App',
                                    web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' }
                                }
                            ]
                        ]
                    }
                });
                return response.message_id;
            }
        }
    } catch (error) {
        console.error(`Error sending message to chat ID ${chatId}:`, error.response?.data || error.message);
        throw error;
    }
};

const broadcastMessage = async (text, imageUrl) => {
    let activeUsers = [];
    try {
        const [rows] = await pool.execute('SELECT tg_id, first_name FROM auth');
        activeUsers = rows;
    } catch (err) {
        console.error('Failed to load active users from DB for broadcast:', err.message);
        activeUsers = Array.from(userChatIds.entries()).map(([tg_id, first_name]) => ({ tg_id, first_name }));
    }

    console.log(`Broadcasting message: "${text}" to ${activeUsers.length} users`);
    const results = [];

    for (const user of activeUsers) {
        const chatId = String(user.tg_id);
        const firstName = user.first_name || 'user';
        const userStatus = {
            chatId: chatId,
            name: firstName,
            success: false,
            error: null
        };

        try {
            let personalizedText = text;
            if (personalizedText) {
                personalizedText = personalizedText.replace(/{name}/gi, firstName).replace(/{first_name}/gi, firstName);
            }

            const messageId = await sendTelegramMessage(chatId, personalizedText, imageUrl, null);
            sentMessageIds.set(chatId, messageId);
            lastMessages.set(chatId, { messageId, text: personalizedText, imageUrl });

            await bot.sendMessage(chatId, personalizedText, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Open App',
                                web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' }
                            }
                        ]
                    ]
                }
            });
            userStatus.success = true;
        } catch (error) {
            const errMsg = error.response?.data?.description || error.response?.data || error.message;
            console.error(`Failed to send message to ${chatId}:`, errMsg);
            userStatus.success = false;
            userStatus.error = errMsg;
        }
        results.push(userStatus);
    }
    return results;
};

const deleteAllBroadcastMessages = async () => {
    for (const [chatId, messageId] of sentMessageIds) {
        try {
            await bot.deleteMessage(chatId, messageId);
        } catch (error) {
            console.error(`Failed to delete message for chat ID ${chatId}:`, error.response?.data || error.message);
        }
    }
};

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const timestamp = new Date().toISOString();
        const userId = req.headers['x-user-id'] || req.body?.userId || req.body?.tg_id || req.body?.uid || req.query?.user_id || 'unauthenticated';
        const summary = req.method !== 'GET' && req.body ? (JSON.stringify(req.body) || '').substring(0, 100) : '';
        console.log(`[${timestamp}] ${req.method} ${req.originalUrl} | User: ${userId} | Status: ${res.statusCode} | Duration: ${duration}ms | Payload: ${summary}`);
    });
    next();
});

app.post('/api/broadcast', async (req, res) => {
    const { message, imageUrl } = req.body;
    if (!message) {
        return res.status(400).send('Message is required');
    }
    try {
        const results = await broadcastMessage(message, imageUrl);
        res.json({ success: true, results });
    } catch (error) {
        console.error('Failed to broadcast message:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/broadcastImage', async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
        return res.status(400).send('Image URL is required');
    }
    try {
        const results = await broadcastMessage('', imageUrl);
        res.json({ success: true, results });
    } catch (error) {
        console.error('Failed to broadcast image:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/sendToUser', async (req, res) => {
    const { chatId, message, imageUrl } = req.body;
    if (!chatId || !message) {
        return res.status(400).send('Chat ID and message are required');
    }
    try {
        const messageId = await sendTelegramMessage(chatId, message, imageUrl, type = null);
        res.send({ messageId });
    } catch (error) {
        console.error(`Failed to send message to user with Chat ID ${chatId}:`, error.message);
        res.status(500).send('Failed to send message to user');
    }
});

app.post('/api/sendToJohn', async (req, res) => {
    const amount = req.body.amount;
    const type = req.body.type;
    const uid = req.body.uid;
    const order = req.body.order;
    const ref = req.body.ref;
    const fp = req.body.panel;
    const pb = req.body.pb;
    const uuid = req.body.uuid;
    const uuuid = req.body.uuuid;
    const service = req.body.service;

    const adminBotInstance = adminBot;
    const userIds = [5928771903, 779060335, 460529558];

    try {
        let userName = 'Unknown';
        if (uid) {
            userName = userChatIds.get(String(uid));
            if (!userName || userName === 'Unknown') {
                try {
                    const [rows] = await pool.execute('SELECT first_name, tg_id FROM auth WHERE tg_id = ? LIMIT 1', [uid]);
                    if (rows.length > 0) {
                        userName = rows[0].first_name || 'Unknown';
                        userChatIds.set(String(uid), userName);
                    } else {
                        const [idRows] = await pool.execute('SELECT first_name, tg_id FROM auth WHERE id = ? LIMIT 1', [uid]);
                        if (idRows.length > 0) {
                            userName = idRows[0].first_name || 'Unknown';
                            if (idRows[0].tg_id) {
                                userChatIds.set(String(idRows[0].tg_id), userName);
                            }
                            userChatIds.set(String(uid), userName);
                        } else {
                            userName = 'Unknown';
                        }
                    }
                } catch (dbErr) {
                    console.error('[sendToJohn] Error fetching username from DB:', dbErr.message);
                    userName = 'Unknown';
                }
            }
        }

        if ((!userName || userName === 'Unknown') && uuid && ['newuser', 'neworder', 'deposit', 'chat', 'ticket'].includes(type)) {
            userName = uuid;
        }

        for (const userId of userIds) {
            let msgText = '';

            if (type == "deposit" && uid != null) {
                msgText = `💰 Deposit: ${userName} (${uid}) - ${amount} ETB (${uuid || 'Unknown'})`;
            } else if (type == "newuser" && amount == null) {
                const rawHandle = req.body.username || (uuid && uuid !== userName ? uuid : '');
                const userHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle) : 'No username';
                msgText = `👤 New User: ${userName || 'User'} (${uid}) (${userHandle})`;
            } else if (type == "neworder") {
                msgText = `📦 Order: ${userName} (${uid}) - ${service} - ${amount} ETB`;
            } else if (type == "ticket" && amount == null) {
                msgText = `🎫 Ticket: ${userName} (${uid})`;
            } else if (type == "phone") {
                msgText = `📞 Phone: ${amount} (${uuid})`;
            } else if (type == "atempt") {
                msgText = `⚠️ Payment: ${uuuid} - ${amount}`;
            } else if (type == "withdrawl") {
                msgText = `💸 Withdraw: ${uuid} - ${amount}`;
            } else if (type == "chat") {
                msgText = `💬 Chat: ${userName} (${uid}) - "${req.body.message}"`;
            } else if (type == "refill") {
                msgText = `🔄 Refill: ${userName} (${uid}) - ${order} (${uuid})`;
            } else if (type == "order_error") {
                msgText = `❌ Error: ${userName} (${uid}) - ${service} - ${req.body.error}`;
            } else if (type == "system_error") {
                msgText = `🚨 Error: ${req.body.file}:${req.body.line} - ${req.body.message}`;
            } else if (type == "refund") {
                msgText = `↩️ Refund: ${userName} (${uid}) - ${order} - ${amount}`;
            } else if (type == "partial") {
                msgText = `📉 <b>Partial Refund</b>\n\n` +
                    `👤 User: ${userName} (<code>${uid}</code>)\n` +
                    `📦 Order ID: <code>${order}</code>\n` +
                    `🔢 Remains: <b>${uuid}</b>\n` +
                    `💵 Refunded: <b>${amount} ETB</b>`;
            } else if (type == "admin_login") {
                msgText = `🔐 <b>Admin Login Detected</b>\n\n` +
                    `🌍 IP: <code>${req.body.ip}</code>\n` +
                    `📱 Device: <code>${req.body.ua}</code>\n` +
                    `🕒 Time: ${new Date().toLocaleString()}`;
            }

            if (msgText) {
                try {
                    await adminBotInstance.sendMessage(userId, msgText, { parse_mode: 'HTML' });
                } catch (sendErr) {
                    console.error(`[sendToJohn DEBUG ERROR] Failed to send message to admin ID ${userId}:`, sendErr.message);
                }
            }
        }
        res.send('Messages sent successfully');
    } catch (error) {
        console.error(`[sendToJohn GLOBAL ERROR] Failed to complete notification request:`, error.message);
        res.status(500).send('Failed to send message to users');
    }
});

app.get('/api/testAdminBot', async (req, res) => {
    const adminBotInstance = adminBot;
    const userIds = [5928771903, 779060335, 460529558];
    const results = [];

    for (const userId of userIds) {
        try {
            await adminBotInstance.sendMessage(userId, `🔔 <b>Paxyo Diagnostic Admin Notification</b>\n\nStatus: <b>Active & Working!</b>\nTimestamp: <code>${new Date().toISOString()}</code>`, { parse_mode: 'HTML' });
            results.push({ userId, success: true });
        } catch (err) {
            results.push({ userId, success: false, error: err.message });
        }
    }
    res.json({ success: true, results });
});

app.get('/api/debug-env', (req, res) => {
    const secret = req.query.secret;
    if (secret !== 'paxyo_secure_2026') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const keys = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'BOT_TOKEN', 'PORT', 'RENDER_EXTERNAL_URL'];
    const envVars = {};

    keys.forEach(key => {
        const val = process.env[key];
        if (val) {
            if (key === 'DB_PASS' || key === 'BOT_TOKEN') {
                envVars[key] = val.replace(/:[A-Za-z0-9_-]{10,}/, ':***').substring(0, 15) + '...';
            } else {
                envVars[key] = val;
            }
        } else {
            envVars[key] = '(NOT SET)';
        }
    });

    res.json(envVars);
});

app.post('/api/deleteAllMessages', async (req, res) => {
    try {
        await deleteAllBroadcastMessages();
        res.send('All broadcast messages deleted successfully');
    } catch (error) {
        console.error('Failed to delete all messages:', error.message);
        res.status(500).send('Failed to delete all messages');
    }
});

app.post('/api/deleteByContent', async (req, res) => {
    const { message, imageUrl } = req.body;

    if (!message && !imageUrl) {
        return res.status(400).send('Either message text or image URL must be provided');
    }

    let deletedCount = 0;

    for (const [chatId, msgData] of lastMessages) {
        const matchesText = message && msgData.text === message;
        const matchesImage = imageUrl && msgData.imageUrl === imageUrl;

        if (matchesText || matchesImage) {
            try {
                await bot.deleteMessage(chatId, msgData.messageId);
                deletedCount++;
            } catch (err) {
                console.error(`Failed to delete for ${chatId}`, err.message);
            }
        }
    }

    res.send(`Deleted ${deletedCount} matching messages`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const WEBHOOK_URL = 'https://abiybot34.onrender.com';

bot.setWebHook(`${WEBHOOK_URL}/bot${process.env.BOT_TOKEN}`).catch(err => {
    console.error('Failed to set webhook:', err.message);
});

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});
