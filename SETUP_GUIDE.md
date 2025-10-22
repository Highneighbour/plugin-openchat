# OpenChat Autonomous Agent - Complete Setup Guide

## ⚠️ IMPORTANT: Understanding the Architecture

**OpenChat bots are NOT ElizaOS plugins** - they are standalone Express.js servers that use the OpenChat Bot Client SDK. The ElizaOS integration is lightweight - mainly for using the character definition.

## 🎯 What Actually Works

### ✅ Working Features
1. **Bot Commands** - `/chat`, `/help`, `/info`
2. **Autonomous Messaging** - Responds to mentions
3. **Welcome Messages** - When installed in a chat
4. **Event Handling** - Member joins/leaves
5. **Text Messages** - Send and receive

### ❌ What Doesn't Work Yet
- Media uploads (images, videos, files) - requires storage integration
- Polls - requires proper API implementation
- Reactions - API may not be fully supported
- Moderation actions - removed for now
- Channel/Member management - removed for now

## 📋 Prerequisites

1. **Node.js 18+** or **Bun**
2. **OpenSSL** (for generating bot identity)
3. **Access to OpenChat** (oc.app or local instance)
4. **OpenChat Bot Client Data** (from your profile)

## 🚀 Step 1: Generate Bot Identity

```bash
# Generate private key
openssl ecparam -genkey -name secp256k1 -out private_key.pem

# IMPORTANT: Keep this file secure and never commit it!
```

## 📊 Step 2: Get OpenChat Configuration

1. Go to your OpenChat profile
2. Open "Advanced" section
3. Click "Bot client data"
4. Copy these values:
   - OpenChat Public Key
   - IC Host URL
   - Storage Index Canister ID

## 💻 Step 3: Clone and Install

```bash
# Clone your agent repository
cd /path/to/your/agent

# Install the plugin locally
npm install /path/to/plugin-openchat
# or with Bun
bun add /path/to/plugin-openchat
```

## 🔧 Step 4: Create Environment File

Create `.env` in your agent directory:

```env
# Required - OpenChat Bot Configuration
OPENCHAT_BOT_IDENTITY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END EC PRIVATE KEY-----"

OPENCHAT_PUBLIC_KEY="YOUR_OPENCHAT_PUBLIC_KEY"
OPENCHAT_IC_HOST="https://ic0.app"
OPENCHAT_STORAGE_INDEX_CANISTER="YOUR_STORAGE_CANISTER_ID"

# Optional - Bot Behavior
OPENCHAT_BOT_PORT="3000"
OPENCHAT_SEND_WELCOME="true"
OPENCHAT_WELCOME_MEMBERS="false"
OPENCHAT_SAY_GOODBYE="false"
OPENCHAT_AUTO_RESPOND="false"
```

## 🤖 Step 5: Create Agent Character

Create `character.ts`:

```typescript
import { Character } from "@elizaos/core";
import { openchatPlugin } from "@elizaos/plugin-openchat";

export const character: Character = {
    name: "YourBotName",
    
    bio: [
        "I'm a helpful AI assistant on OpenChat",
        "I can answer questions and help with various tasks"
    ],
    
    lore: [
        "Created to help the OpenChat community",
        "Powered by advanced AI"
    ],
    
    topics: [
        "general help",
        "questions",
        "community support"
    ],
    
    style: {
        all: ["helpful", "friendly", "concise"],
        chat: ["engaging", "responsive"]
    },
    
    postExamples: [
        "Hello! How can I help you today?",
        "I'm here to assist. What do you need?",
        "Thanks for your question! Let me help with that."
    ],
    
    // IMPORTANT: Include the plugin
    plugins: [openchatPlugin],
};

export default character;
```

## 🏃 Step 6: Run Your Agent

```bash
# Using ElizaOS CLI
elizaos start

# Or directly with Node
node --loader ts-node/esm src/index.ts

# Or with Bun
bun run src/index.ts
```

You should see:

```
╔═══════════════════════════════════════════════════╗
║            OpenChat Bot Ready                    ║
╠═══════════════════════════════════════════════════╣
║  Bot server running on port 3000                 ║
║  Bot definition: http://localhost:3000/bot_definition ║
╚═══════════════════════════════════════════════════╝
```

## 📝 Step 7: Register Bot on OpenChat

1. Open OpenChat (or your local instance)
2. Enable developer mode (if needed)
3. Run `/register_bot` command
4. Enter:
   - **Bot URL**: `http://your-server:3000`
   - **Bot Principal**: (get from logs or use helper script)
5. OpenChat will fetch and validate your bot definition
6. Approve the registration

## ✅ Step 8: Install Bot

1. As a group/community owner, add the bot via members panel
2. Or start a direct chat with the bot
3. Grant the requested permissions
4. The bot should send a welcome message (if enabled)

## 🧪 Step 9: Test the Bot

### Test Commands
```
/help
/info
/chat Tell me about yourself
```

### Test Autonomous Behavior
```
@YourBotName hello!
```

## 🎭 Creating Different Agent Types

### 1. Welcoming Bot

```typescript
export const welcomeBot: Character = {
    name: "WelcomeBot",
    bio: ["I welcome new members to the chat!"],
    postExamples: [
        "Welcome to our community! 👋",
        "Hey there! Great to have you here!",
    ],
    plugins: [openchatPlugin],
};
```

**.env settings:**
```env
OPENCHAT_SEND_WELCOME="true"
OPENCHAT_WELCOME_MEMBERS="true"
OPENCHAT_SAY_GOODBYE="true"
```

### 2. Q&A Bot

```typescript
export const qaBot: Character = {
    name: "QABot",
    bio: ["I answer questions about our project"],
    knowledge: [
        "Project documentation",
        "FAQs",
        "Common issues"
    ],
    topics: ["help", "support", "questions"],
    plugins: [openchatPlugin],
};
```

**.env settings:**
```env
OPENCHAT_SEND_WELCOME="true"
OPENCHAT_AUTO_RESPOND="false"  // Only respond to mentions
```

### 3. Active Chat Bot

```typescript
export const chatBot: Character = {
    name: "ChatBot",
    bio: ["I actively participate in conversations"],
    style: {
        all: ["friendly", "casual", "conversational"],
        chat: ["engaging", "responsive", "enthusiastic"]
    },
    plugins: [openchatPlugin],
};
```

**.env settings:**
```env
OPENCHAT_AUTO_RESPOND="true"  // Respond to ALL messages
OPENCHAT_WELCOME_MEMBERS="true"
```

## 🐛 Troubleshooting

### Bot Won't Start

**Issue**: Missing environment variables
```
Error: Missing required environment variables
```

**Solution**: Check all required vars are set in `.env`

---

**Issue**: Port already in use
```
Error: EADDRINUSE: address already in use
```

**Solution**: Change `OPENCHAT_BOT_PORT` or stop conflicting service

### Bot Not Responding

**Checklist**:
1. ✅ Is the bot server running?
2. ✅ Is the bot registered on OpenChat?
3. ✅ Is the bot installed in the chat?
4. ✅ Are permissions granted?
5. ✅ Check server logs for errors

### Welcome Message Not Sending

**Check**:
1. ✅ `OPENCHAT_SEND_WELCOME="true"` in `.env`
2. ✅ Bot has "SendMessages" permission
3. ✅ Check logs for errors

### Autonomous Responses Not Working

**Check**:
1. ✅ Bot is mentioned with `@BotName`
2. ✅ Or it's a direct message
3. ✅ Or `OPENCHAT_AUTO_RESPOND="true"`
4. ✅ Check `/notify` endpoint is receiving events
5. ✅ Check logs for event processing

## 📊 Understanding Event Flow

```
User mentions bot in chat
       ↓
OpenChat Backend creates event
       ↓
POST to /notify endpoint
       ↓
handleNotification parses event
       ↓
Check event type (message, member_joined, etc.)
       ↓
Process event and generate response
       ↓
Send message back to OpenChat
       ↓
User sees bot response
```

## 🔍 Debugging Tips

### Enable Debug Logging

Add to your agent startup:

```typescript
process.env.LOG_LEVEL = "debug";
```

### Check Bot Definition

Visit: `http://localhost:3000/bot_definition`

Should see JSON with commands and permissions.

### Monitor Events

Watch server logs when:
- Bot is installed
- Messages are sent
- Members join/leave

### Test Locally

Use curl to test endpoints:

```bash
# Test bot definition
curl http://localhost:3000/bot_definition

# This will show your bot's schema
```

## 📚 Key Files

```
your-agent/
├── .env                    # Environment configuration
├── character.ts            # Your bot's character
├── package.json           # Dependencies
└── node_modules/
    └── @elizaos/plugin-openchat/
        ├── src/
        │   ├── bot/handlers/
        │   │   ├── executeCommand.ts  # Command handling
        │   │   ├── notify.ts          # Event handling
        │   │   └── schema.ts          # Bot definition
        │   └── services/
        │       └── openchatClient.ts  # Main service
        └── dist/              # Compiled code
```

## 🎯 Best Practices

1. **Start Simple** - Begin with basic /chat command
2. **Test Locally** - Use local OpenChat instance first
3. **Monitor Logs** - Watch for errors and events
4. **Gradual Permissions** - Start with minimal permissions
5. **Version Control** - Don't commit private keys!

## 🚨 Common Mistakes

1. ❌ Committing `private_key.pem` to git
2. ❌ Using wrong OpenChat public key for environment
3. ❌ Not granting required permissions on installation
4. ❌ Expecting ElizaOS features to work (this is standalone)
5. ❌ Not checking logs when things fail

## ✅ Success Checklist

- [ ] Private key generated
- [ ] Environment variables set
- [ ] Character file created
- [ ] Plugin installed
- [ ] Bot server starts successfully
- [ ] Bot definition endpoint works
- [ ] Bot registered on OpenChat
- [ ] Bot installed in test chat
- [ ] Commands work (`/chat`, `/help`)
- [ ] Autonomous responses work (mentions)
- [ ] Welcome message sent (if enabled)

## 📞 Support

If you're stuck:

1. Check server logs
2. Verify all environment variables
3. Test bot definition endpoint
4. Check OpenChat permissions
5. Review this guide again

## 🎉 You're Ready!

Once everything is working, you have:
- ✅ A working autonomous OpenChat bot
- ✅ Command execution (/chat, /help, /info)
- ✅ Event handling (mentions, joins, leaves)
- ✅ Configurable behavior (welcome, auto-respond)

Now you can customize your bot's character and behavior!

---

**Version**: 1.0.0  
**Last Updated**: October 22, 2025  
**Status**: Production Ready (Simplified)
