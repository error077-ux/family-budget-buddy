import { bot } from "../bot.js";
import { supabase } from "../services/supabaseService.js";

/* 📅 TODAY SUMMARY */
export async function todaySummary(chatId) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("dashboard")
    .select("amount")
    .eq("date", today);

  if (error || !data.length) {
    return bot.sendMessage(chatId, "📅 Today\nNo expenses recorded.");
  }

  const total = data.reduce((s, r) => s + Number(r.amount), 0);

  bot.sendMessage(
    chatId,
    `📅 *Today Summary*\n\n💸 Total Spent: ₹${total}`,
    { parse_mode: "Markdown" }
  );
}

/* 📆 MONTH SUMMARY */
export async function monthSummary(chatId) {
  const start = new Date();
  start.setDate(1);

  const { data } = await supabase
    .from("dashboard")
    .select("amount")
    .gte("date", start.toISOString().split("T")[0]);

  if (!data || !data.length) {
    return bot.sendMessage(chatId, "📆 This Month\nNo expenses recorded.");
  }

  const total = data.reduce((s, r) => s + Number(r.amount), 0);

  bot.sendMessage(
    chatId,
    `📆 *This Month*\n\n💸 Total Spent: ₹${total}`,
    { parse_mode: "Markdown" }
  );
}

/* 💳 OUTSTANDING */
export async function outstandingSummary(chatId) {
  const { data: loans } = await supabase
    .from("loans")
    .select("outstanding_amount")
    .eq("is_paid", false);

  const { data: cards } = await supabase
    .from("credit_cards")
    .select("outstanding");

  const loanTotal = loans?.reduce((s, l) => s + Number(l.outstanding_amount), 0) || 0;
  const cardTotal = cards?.reduce((s, c) => s + Number(c.outstanding), 0) || 0;

  bot.sendMessage(
    chatId,
    `💳 *Outstanding Summary*\n\n📄 Loans: ₹${loanTotal}\n💳 Cards: ₹${cardTotal}`,
    { parse_mode: "Markdown" }
  );
}
