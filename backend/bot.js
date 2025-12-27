import TelegramBot from "node-telegram-bot-api";
import { registerHandlers } from "./telegram/handlers.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("❌ TELEGRAM_BOT_TOKEN is missing");

/* ✅ EXPORT bot */
export const bot = new TelegramBot(token, { polling: true });

/* Reset auth on every /start */
bot.onText(/\/start/, (msg) => {
  global.state = { authenticated: false };
  bot.sendMessage(msg.chat.id, "🔐 Enter PIN to continue:");
});

/* Attach handlers */
registerHandlers(bot);

console.log("🤖 Telegram bot initialized");
