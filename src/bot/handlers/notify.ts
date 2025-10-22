import { Request, Response } from "express";
import { 
    BotClient, 
    BotEvent, 
    handleNotification, 
    InstallationRecord 
} from "@open-ic/openchat-botclient-ts";
import { IAgentRuntime } from "@elizaos/core";
import { OpenChatClientService } from "../../services/openchatClient.js";

/**
 * Main notification handler for autonomous bot events
 * Uses the proper handleNotification from OpenChat SDK
 */
export async function notifyHandler(
    req: Request,
    res: Response,
    runtime: IAgentRuntime,
    service: OpenChatClientService
): Promise<void> {
    const signature = req.headers["x-oc-signature"] as string;
    
    await handleNotification(
        signature,
        req.body as Buffer,
        service.getFactory(),
        async (client: BotClient, ev: BotEvent, apiGateway: string) => {
            runtime.logger?.debug(`[OpenChat] Event received: ${ev.kind}`);
            
            try {
                // Handle different event types
                if (ev.kind === "bot_installed_event") {
                    await handleBotInstalled(client, ev, apiGateway, runtime, service);
                } else if (ev.kind === "bot_uninstalled_event") {
                    await handleBotUninstalled(client, ev, runtime, service);
                } else if (ev.kind === "bot_chat_event") {
                    await handleChatEvent(client, ev, apiGateway, runtime, service);
                }
                
                res.status(200).json({});
            } catch (error: any) {
                runtime.logger?.error("[OpenChat] Error handling event:", error.message);
                res.status(200).json({}); // Still return 200 to OpenChat
            }
        },
        (error) => {
            runtime.logger?.error("[OpenChat] Event parse failure:", error);
            res.status(500).json({ error: "Event parse failure" });
        }
    );
}

/**
 * Handle bot installation event
 */
async function handleBotInstalled(
    client: BotClient,
    ev: Extract<BotEvent, { kind: "bot_installed_event" }>,
    apiGateway: string,
    runtime: IAgentRuntime,
    service: OpenChatClientService
): Promise<void> {
    runtime.logger?.info("[OpenChat] Bot installed:", ev.location);
    
    // Store installation record
    const record = new InstallationRecord(
        apiGateway,
        ev.grantedCommandPermissions,
        ev.grantedAutonomousPermissions
    );
    
    const locationKey = getLocationKey(ev.location);
    service.recordInstallation(locationKey, ev.location as any, record);
    
    // Send welcome message if enabled and we have permission
    const shouldWelcome = runtime.getSetting("OPENCHAT_SEND_WELCOME") === "true";
    
    if (shouldWelcome && ev.grantedAutonomousPermissions.hasMessagePermission("Text")) {
        try {
            const welcomeMsg = await client.createTextMessage(
                `👋 Hello! I'm ${runtime.character.name}. ${runtime.character.bio?.[0] || "I'm here to help!"}\n\nUse /chat to talk with me!`
            );
            welcomeMsg.setFinalised(true);
            await client.sendMessage(welcomeMsg);
            runtime.logger?.success("[OpenChat] Welcome message sent");
        } catch (error: any) {
            runtime.logger?.error("[OpenChat] Failed to send welcome:", error.message);
        }
    }
}

/**
 * Handle bot uninstallation event
 */
async function handleBotUninstalled(
    client: BotClient,
    ev: Extract<BotEvent, { kind: "bot_uninstalled_event" }>,
    runtime: IAgentRuntime,
    service: OpenChatClientService
): Promise<void> {
    runtime.logger?.info("[OpenChat] Bot uninstalled:", ev.location);
    
    const locationKey = getLocationKey(ev.location);
    service.recordUninstallation(locationKey);
}

/**
 * Handle chat events (messages, member joins, etc.)
 */
async function handleChatEvent(
    client: BotClient,
    ev: Extract<BotEvent, { kind: "bot_chat_event" }>,
    apiGateway: string,
    runtime: IAgentRuntime,
    service: OpenChatClientService
): Promise<void> {
    const chatEvent = ev.event;
    
    // Handle message events
    if (chatEvent.kind === "message") {
        await handleMessageEvent(client, ev, chatEvent, runtime);
    }
    // Handle member joined events
    else if (chatEvent.kind === "member_joined") {
        await handleMemberJoined(client, chatEvent, runtime);
    }
    // Handle member left events
    else if (chatEvent.kind === "member_left") {
        await handleMemberLeft(client, chatEvent, runtime);
    }
}

/**
 * Handle incoming message
 */
async function handleMessageEvent(
    client: BotClient,
    ev: Extract<BotEvent, { kind: "bot_chat_event" }>,
    messageEvent: Extract<typeof ev.event, { kind: "message" }>,
    runtime: IAgentRuntime
): Promise<void> {
    // Only handle text messages
    if (messageEvent.content.kind !== "text_content") {
        return;
    }
    
    const text = messageEvent.content.text;
    const sender = messageEvent.sender;
    
    runtime.logger?.debug(`[OpenChat] Message from ${sender}: ${text.substring(0, 50)}`);
    
    // Check if bot should respond
    const botName = runtime.character.name;
    const isMentioned = text.includes(`@${botName}`);
    const isDirectChat = client.chatScope?.Chat?.chat.kind === "direct_chat";
    const autoRespond = runtime.getSetting("OPENCHAT_AUTO_RESPOND") === "true";
    
    if (!isMentioned && !isDirectChat && !autoRespond) {
        runtime.logger?.debug("[OpenChat] Not responding - no mention/DM");
        return;
    }
    
    // Skip if message is from the bot itself
    if (sender === client.chatScope?.Chat?.chat.them) {
        return;
    }
    
    try {
        // Clean the message text (remove mention)
        const cleanText = text.replace(`@${botName}`, "").trim();
        
        // Generate response using character
        const response = await generateResponse(cleanText, runtime);
        
        // Send response
        const responseMsg = await client.createTextMessage(response);
        responseMsg.setFinalised(true);
        await client.sendMessage(responseMsg);
        
        runtime.logger?.success(`[OpenChat] Responded to message`);
    } catch (error: any) {
        runtime.logger?.error("[OpenChat] Error responding to message:", error.message);
    }
}

/**
 * Handle member joined event
 */
async function handleMemberJoined(
    client: BotClient,
    event: Extract<BotEvent["kind"] extends "bot_chat_event" ? BotEvent["event"] : never, { kind: "member_joined" }>,
    runtime: IAgentRuntime
): Promise<void> {
    const shouldWelcome = runtime.getSetting("OPENCHAT_WELCOME_MEMBERS") === "true";
    
    if (!shouldWelcome) {
        return;
    }
    
    try {
        const welcomeMsg = await client.createTextMessage(
            `Welcome to the chat! 👋`
        );
        welcomeMsg.setFinalised(true);
        await client.sendMessage(welcomeMsg);
        
        runtime.logger?.debug("[OpenChat] Welcomed new member");
    } catch (error: any) {
        runtime.logger?.error("[OpenChat] Failed to welcome member:", error.message);
    }
}

/**
 * Handle member left event
 */
async function handleMemberLeft(
    client: BotClient,
    event: Extract<BotEvent["kind"] extends "bot_chat_event" ? BotEvent["event"] : never, { kind: "member_left" }>,
    runtime: IAgentRuntime
): Promise<void> {
    const shouldSayGoodbye = runtime.getSetting("OPENCHAT_SAY_GOODBYE") === "true";
    
    if (!shouldSayGoodbye) {
        return;
    }
    
    try {
        const goodbyeMsg = await client.createTextMessage(
            `Goodbye! 👋`
        );
        goodbyeMsg.setFinalised(true);
        await client.sendMessage(goodbyeMsg);
        
        runtime.logger?.debug("[OpenChat] Said goodbye to leaving member");
    } catch (error: any) {
        runtime.logger?.error("[OpenChat] Failed to say goodbye:", error.message);
    }
}

/**
 * Generate AI response using character
 */
async function generateResponse(text: string, runtime: IAgentRuntime): Promise<string> {
    const character = runtime.character;
    
    // Build simple prompt
    const prompt = `You are ${character.name}. ${character.bio?.[0] || ""}

User: ${text}

${character.name}:`;
    
    try {
        // Try to use ElizaOS text generation if available
        if (typeof (runtime as any).generateText === 'function') {
            const response = await (runtime as any).generateText(prompt);
            return String(response).trim();
        } else if (typeof (runtime as any).completion === 'function') {
            const response = await (runtime as any).completion({
                prompt,
                stop: ["\n\n", "User:"],
            });
            return String(response.text || response.content || response).trim();
        }
    } catch (error: any) {
        runtime.logger?.warn("[OpenChat] AI generation failed:", error.message);
    }
    
    // Fallback to simple responses
    const responses = character.postExamples || [
        "Thanks for your message! How can I help you?",
        "I'm here to assist. What would you like to know?",
        "Hello! What can I do for you today?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Get location key for storage
 */
function getLocationKey(location: any): string {
    if (location.kind === "group_chat") {
        return `group-${location.chatId}`;
    } else if (location.kind === "channel") {
        return `channel-${location.channelId}`;
    } else if (location.kind === "direct_chat") {
        return `direct-${location.userId}`;
    }
    return "unknown";
}

export default notifyHandler;
