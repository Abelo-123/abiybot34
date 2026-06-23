try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed or environment variables already set
}
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const cors = require('cors'); // Import cors
const fs = require('fs'); // Import file system module
const mysql = require('mysql2/promise'); // Import MySQL client

const lastMessages = new Map(); // Stores { chatId: { messageId, text, imageUrl } }

// Bot for user-facing messages (inline keyboard, web app)
const bot = new TelegramBot(process.env.BOT_TOKEN);

// Bot for admin notifications (deposits, orders, etc.)
const ADMIN_BOT_TOKEN = '8731737556:AAGkhIskrrQMAXdbCfEiz0RJkdqDYJ7lmKE';
const adminBot = new TelegramBot(ADMIN_BOT_TOKEN);

// MySQL Connection Pool (using credentials from environment or fallback)
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

// 🔹 Store chat IDs and message IDs
const userChatIds = new Map();
const sentMessageIds = new Map();

// Load user chat IDs from MySQL (auth table)
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

// Save or update a user in MySQL
const saveUserChatId = async (user) => {
    try {
        const tgId = user.id.toString();
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const username = user.username || '';

        await pool.execute(
            `INSERT INTO auth (tg_id, first_name, last_name, username, created_at, last_seen) 
             VALUES (?, ?, ?, ?, NOW(), NOW()) 
             ON DUPLICATE KEY UPDATE last_seen = NOW(), first_name = VALUES(first_name), last_name = VALUES(last_name), username = VALUES(username)`,
            [tgId, firstName, lastName, username]
        );

        userChatIds.set(tgId, firstName || 'user');
        console.log(`User ${tgId} saved/updated in MySQL.`);
    } catch (error) {
        console.error(`Failed to save user ${user.id} to MySQL:`, error.message);
    }
};

// Call loadUserChatIds when the bot starts
loadUserChatIds();

// Helper: Check if user has phone number (via your PHP API)
const checkUserPhone = async (tgId) => {
    try {
        const response = await axios.get(`https://paxyo.com/api_check_phone.php?tg_id=${tgId}`);
        return response.data.has_phone === true;
    } catch (error) {
        console.error('Error checking phone:', error.message);
        return true; // Assume they have phone to not block flow
    }
};

// Helper: Save phone number via PHP API
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

// 🔹 On /start, get user ID and send welcome
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    const user = msg.from;
    console.log(`New user started bot: ${username || 'Unknown'} (Chat ID: ${chatId})`);
    const dynamicUrl = createAuthUrl(user);

    // ✅ Save user to MySQL (non-blocking) and update in-memory Set
    saveUserChatId(user).catch(err => console.error('BG Save Error:', err));

    // Check if user has phone number
    const hasPhone = await checkUserPhone(chatId);

    if (!hasPhone) {
        // Request phone number first (Optional)
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

    // ✅ Send welcome image with Start App button (ALWAYS shown)
    try {
        const welcomeText = `👋 <b>Hey, welcome aboard ${firstName || 'friend'}!</b> 🇪🇹\n\n` +
            `You've just unlocked a space built for creators, dreamers and doers.\n\n` +
            `👥 Followers, 🎥 views, 💬 members እንዲሁም ከ750+ አገልግሎት ለሁሉም ሶሻል ሚዲያ በማይገመት ዋጋ።\n\n` +
            `ስለ አገልግሎቱ አዳዲስ መረጃ እንዲደርስዎ የቴሌግራም ቻናላችን ይቀላቀሉ።\n` +
            `📌 Updates: <a href="https://t.me/paxyo251">t.me/paxyo251</a>`;

        await bot.sendPhoto(chatId, 'https://i.ibb.co/nsW64qKb/pop.jpg', {
            caption: welcomeText,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Start App',
                            web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' }
                        }
                    ],
                    [
                        {
                            text: 'How to order',
                            callback_data: 'how_to_order'
                        }
                    ]
                ]
            }
        });

        console.log(`Single welcome message with all buttons sent to ${chatId}`);
    } catch (error) {
        console.error(`Failed to send welcome message to ${chatId}:`, error.message);
        // Minimal fallback
        await bot.sendMessage(chatId, `👋 Welcome! Launch App here:`, {
            reply_markup: {
                inline_keyboard: [[{ text: '🦾 Open App', web_app: { url: 'https://musical-caramel-cae47e.netlify.app/' } }]]
            }
        }).catch(e => console.error('Fallback fail:', e.message));
    }
});

// Handle contact sharing (phone number)
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;

    // Only process if user shared their own contact
    if (contact.user_id === msg.from.id) {
        const phone = contact.phone_number;
        console.log(`Phone received from ${chatId}: ${phone}`);

        // Save phone number
        await saveUserPhone(chatId, phone);

        // Confirm and show app
        await bot.sendMessage(chatId, "✅ <b>Phone number saved!</b>\n\nThank you for sharing your contact. Our support team can now reach you directly if needed.", {
            parse_mode: 'HTML',
            reply_markup: { remove_keyboard: true }
        });

        // Send app button
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

// Handle all incoming messages to ensure users are captured
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Capture user if not already in the set (to "avoid that" missing user issue)
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

        // Remove keyboard
        await bot.sendMessage(chatId, ".", {
            reply_markup: { remove_keyboard: true }
        }).then(sentMsg => {
            // Delete the dot message
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


// 🔹 Function to send a message with optional image
const sendTelegramMessage = async (chatId, text, imageUrl, type, amount, uid, tid) => {
    try {
        if (imageUrl && amount == null && uid == null) {
            const response = await bot.sendPhoto(chatId, imageUrl, {
                //caption: text,
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
            console.log(`Photo sent to chat ID ${chatId}:`, response);
            return response.message_id; // Return the message ID
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
                console.log(`Message sent to chat ID ${chatId}:`, response);
                return response.message_id; // Return the message ID
            }
        }
    } catch (error) {
        console.error(`Error sending message to chat ID ${chatId}:`, error.response?.data || error.message);
        throw error;
    }
};

// 🔹 Function to broadcast a message to all users
const broadcastMessage = async (text, imageUrl) => {
    console.log(`Broadcasting message: "${text}" to ${userChatIds.size} users`);
    const results = [];

    for (const [chatId, firstName] of userChatIds) {
        console.log(`Attempting to send message to chat ID: ${chatId}`);
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
            lastMessages.set(chatId, { messageId, text: personalizedText, imageUrl }); // Save full context
            console.log(`Message sent successfully to chat ID: ${chatId}`);

            // Send the inline button after each broadcast message
            await bot.sendMessage(chatId, personalizedText, {
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

// 🔹 Function to delete all broadcast messages for all users
const deleteAllBroadcastMessages = async () => {
    console.log(`Deleting all broadcasted messages for ${sentMessageIds.size} users`);

    for (const [chatId, messageId] of sentMessageIds) {
        try {
            await bot.deleteMessage(chatId, messageId);
            console.log(`Message with ID ${messageId} deleted for chat ID: ${chatId}`);
        } catch (error) {
            console.error(`Failed to delete message for chat ID ${chatId}:`, error.response?.data || error.message);
        }
    }
};



// 🔹 Express server setup
const app = express();
app.use(cors()); // Enable CORS
app.use(express.json());

// Endpoint to broadcast messages (text + image)
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

// Endpoint to broadcast only image
app.post('/api/broadcastImage', async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).send('Image URL is required');
    }

    try {
        const results = await broadcastMessage('', imageUrl); // Send only the image
        res.json({ success: true, results });
    } catch (error) {
        console.error('Failed to broadcast image:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint to send a message to a specific user
app.post('/api/sendToUser', async (req, res) => {
    const { chatId, message, imageUrl } = req.body;
    if (!chatId || !message) {
        return res.status(400).send('Chat ID and message are required');
    }
    try {
        const messageId = await sendTelegramMessage(chatId, message, imageUrl, type = null);
        res.send({ messageId }); // Return the message ID
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
    //const tid = req.body.tid;
    const uuid = req.body.uuid;
    const uuuid = req.body.uuuid;
    const service = req.body.service;

    const adminBotInstance = adminBot; // reuse the already-created admin bot instance

    const userIds = [5928771903, 779060335, 460529558]; // Liffrst of user IDs

    try {
        console.log(`[sendToJohn] Received notification request. Type: ${type}, UID: ${uid}, Amount: ${amount}`);
        let userName = 'Unknown';
        if (uid) {
            userName = userChatIds.get(String(uid));
            console.log(`[sendToJohn] Cache lookup for ${uid}: ${userName}`);
            if (!userName || userName === 'Unknown') {
                try {
                    console.log(`[sendToJohn] Cache miss. Querying DB by tg_id = ${uid}`);
                    const [rows] = await pool.execute('SELECT first_name, tg_id FROM auth WHERE tg_id = ? LIMIT 1', [uid]);
                    if (rows.length > 0) {
                        userName = rows[0].first_name || 'Unknown';
                        console.log(`[sendToJohn] Found by tg_id: ${userName}`);
                        userChatIds.set(String(uid), userName);
                    } else {
                        // Fallback check by primary key `id` in case PHP sends the auto-increment id instead of tg_id
                        console.log(`[sendToJohn] tg_id not found. Querying DB by id = ${uid}`);
                        const [idRows] = await pool.execute('SELECT first_name, tg_id FROM auth WHERE id = ? LIMIT 1', [uid]);
                        if (idRows.length > 0) {
                            userName = idRows[0].first_name || 'Unknown';
                            console.log(`[sendToJohn] Found by internal DB id: ${userName}`);
                            if (idRows[0].tg_id) {
                                userChatIds.set(String(idRows[0].tg_id), userName);
                            }
                            userChatIds.set(String(uid), userName);
                        } else {
                            console.log(`[sendToJohn] No user found in DB for UID ${uid}`);
                            userName = 'Unknown';
                        }
                    }
                } catch (dbErr) {
                    console.error('[sendToJohn] Error fetching username from DB:', dbErr.message);
                    userName = 'Unknown';
                }
            }
        }

        // Fallback: If cache and DB lookups resulted in 'Unknown', use the name sent in the uuid parameter
        if ((!userName || userName === 'Unknown') && uuid && ['newuser', 'neworder', 'deposit', 'chat', 'ticket'].includes(type)) {
            userName = uuid;
        }

        console.log(`[sendToJohn] Resolved username: ${userName}`);

        for (const userId of userIds) {
            let msgText = '';

            if (type == "deposit" && uid != null) {
                msgText = `💰 Deposit: ${userName} (${uid}) - ${amount} ETB (${uuid || 'Unknown'})`;

            } else if (type == "newuser" && amount == null) {
                msgText = `👤 New User: ${userName} (${uid}) (${uuid})`;

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
                await adminBotInstance.sendMessage(userId, msgText, { parse_mode: 'HTML' });
            }
        }
        res.send('Messages sent successfully'); // Return success response
    } catch (error) {
        console.error(`Failed to send message to users:`, error.message);
        res.status(500).send('Failed to send message to users');
    }
});


// Endpoint to delete a message for all users
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

app.get('/api/getServicesofgodofpanel', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT bigvalueforgodofpanel FROM panel WHERE owner = ? AND `key` = ? LIMIT 1',
            [6528707984, 'disabled']
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching data from MySQL:', error.message);
        res.status(500).json({ error: 'Error fetching data', message: error.message });
    }
});

app.get('/api/getServicesofsmma', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT bigvalueforsmma FROM panel WHERE owner = ? AND `key` = ? LIMIT 1',
            [6528707984, 'disabled']
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching data from MySQL:', error.message);
        res.status(500).json({ error: 'Error fetching data', message: error.message });
    }
});

app.get('/api/getrecoforgodofpanel', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT message FROM adminmessage WHERE father = ? AND `from` = ?",
            [6528707984, 'Admin-re-forgodofpanel']
        );

        res.json(rows);
    } catch (error) {
        console.error('Error fetching recommended services from MySQL:', error.message);
        res.status(500).json({ error: 'Error fetching data', message: error.message });
    }
});


// Start the Express server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


const WEBHOOK_URL = process.env.RENDER_EXTERNAL_URL || 'https://abiybot34.onrender.com';

bot.setWebHook(`${WEBHOOK_URL}/bot${process.env.BOT_TOKEN}`);

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Set the menu button to open the Mini App
// bot.setChatMenuButton({
//     menu_button: JSON.stringify({
//         type: 'web_app',
//         text: 'Open',
//         web_app: {
//             url: 'https://musical-caramel-cae47e.netlify.app/'
//         }
//     })
// });
