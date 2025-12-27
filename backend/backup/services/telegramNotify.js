import { bot } from "../bot.js";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID; 
// for now single-user, later we map via telegram_users table

export function notify(message) {
  if (!CHAT_ID) return;
  bot.sendMessage(CHAT_ID, message);
}
