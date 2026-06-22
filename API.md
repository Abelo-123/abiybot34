# Paxyo Bot API Documentation

## Base URL
```
https://paxyo-bot.onrender.com
```

## Send Notification to Admins
Sends a notification message to all registered admin users.

**Endpoint:** `POST /api/sendToJohn`

**Headers:**
```
Content-Type: application/json
```

### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | ✅ | Message type: `newuser`, `neworder`, `deposit`, `withdrawl`, `ticket`, `phone`, `atempt`, `chat`, `refill`, `order_error`, `system_error`, `refund`, `partial` |
| `uid` | string | ✅* | User ID |
| `amount` | string | ✅* | Amount (ETB) or phone number |
| `uuid` | string | ✅* | User name or payment method |
| `order` | string | ✅* | Order ID |
| `service` | string | ✅* | Service name |
| `ref` | string | ❌ | Referrer ID |
| `panel` | string | ❌ | Panel name |
| `pb` | string | ❌ | Previous balance |
| `uuuid` | string | ✅* | Another user ID |
| `message` | string | ✅* | Chat message text |
| `error` | string | ✅* | Error message |
| `file` | string | ✅* | File name (system error) |
| `line` | string | ✅* | Line number (system error) |

*Required based on type

### Examples

#### New User Registration
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "newuser", "uid": "123456789", "uuid": "John Doe"}'
```
Message: `👤 New User: 123456789 (John Doe)`

---

#### New Order
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "neworder", "uid": "123456789", "uuid": "John Doe", "service": "Followers", "order": "ORD123", "amount": "100"}'
```
Message: `📦 Order: 123456789 - Followers - 100 ETB`

---

#### Deposit
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "deposit", "uid": "123456789", "uuid": "Chapa", "amount": "500"}'
```
Message: `💰 Deposit: 123456789 - 500 ETB (Chapa)`

---

#### Withdrawal
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "withdrawl", "uuid": "123456789", "amount": "200"}'
```
Message: `💸 Withdraw: 123456789 - 200`

---

#### Support Ticket
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "ticket", "uid": "123456789"}'
```
Message: `🎫 Ticket: 123456789`

---

#### Phone Verification
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "phone", "uuid": "123456789", "amount": "+251912345678"}'
```
Message: `📞 Phone: +251912345678 (123456789)`

---

#### Payment Attempt
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "atempt", "uuuid": "123456789", "amount": "50"}'
```
Message: `⚠️ Payment: 123456789 - 50`

---

#### Chat Message
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "chat", "uid": "123456789", "message": "Hello support"}'
```
Message: `💬 Chat: 123456789 - "Hello support"`

---

#### Refill Request
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "refill", "uid": "123456789", "order": "ORD123", "uuid": "REF456"}'
```
Message: `🔄 Refill: 123456789 - ORD123 (REF456)`

---

#### Order Error
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "order_error", "uid": "123456789", "service": "Likes", "error": "Insufficient funds"}'
```
Message: `❌ Error: 123456789 - Likes - Insufficient funds`

---

#### System Error
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "system_error", "file": "bot.js", "line": "50", "message": "Database connection failed"}'
```
Message: `🚨 Error: bot.js:50 - Database connection failed`

---

#### Refund
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "refund", "uid": "123456789", "order": "ORD123", "amount": "50"}'
```
Message: `↩️ Refund: 123456789 - ORD123 - 50`

---

#### Partial Refund
```bash
curl -X POST https://paxyo-bot.onrender.com/api/sendToJohn \
  -H "Content-Type: application/json" \
  -d '{"type": "partial", "uid": "123456789", "order": "ORD123", "amount": "25"}'
```
Message: `📉 Partial: 123456789 - ORD123 - 25`

---

### Response
```json
{"success": true, "message": "Notifications sent to admins"}
```

### Admin User IDs
Notifications are sent to: `5928771903`, `779060335`, `460529558`