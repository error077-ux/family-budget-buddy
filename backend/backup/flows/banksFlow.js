import { bot } from "../bot.js";
import { supabase } from "../services/supabaseService.js";

/* 👀 VIEW BANKS + BALANCE (LEDGER-BASED) */
export async function viewBanks(chatId) {
  const { data: banks, error } = await supabase
    .from("banks")
    .select("id,name");

  if (error || !banks.length) {
    return bot.sendMessage(chatId, "🏦 No banks found.");
  }

  let message = "🏦 *Banks & Balances*\n\n";

  for (const bank of banks) {
    const { data: ledger } = await supabase
      .from("bank_ledger")
      .select("debit,credit")
      .eq("bank_id", bank.id);

    const balance = ledger?.reduce(
      (sum, l) => sum + (Number(l.credit || 0) - Number(l.debit || 0)),
      0
    ) || 0;

    message += `• ${bank.name} : ₹${balance}\n`;
  }

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

/* 📄 BANK LEDGER (SELECT BANK FIRST) */
export async function selectBankForLedger(chatId) {
  const { data: banks } = await supabase
    .from("banks")
    .select("id,name");

  const keyboard = banks.map(b => [
    { text: b.name, callback_data: `BANK_LEDGER_${b.id}` }
  ]);

  keyboard.push([{ text: "⬅ Back", callback_data: "BANKS" }]);

  bot.sendMessage(chatId, "📄 Select Bank for Ledger", {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/* 📄 SHOW LAST 10 LEDGER ENTRIES */
export async function showBankLedger(chatId, bankId) {
  const { data: rows } = await supabase
    .from("bank_ledger")
    .select("date,description,debit,credit")
    .eq("bank_id", bankId)
    .order("date", { ascending: false })
    .limit(10);

  if (!rows || !rows.length) {
    return bot.sendMessage(chatId, "📄 No ledger entries found.");
  }

  let msg = "📄 *Last 10 Transactions*\n\n";

  for (const r of rows) {
    const amt = r.debit ? `-₹${r.debit}` : `+₹${r.credit}`;
    msg += `${r.date} | ${amt}\n${r.description}\n\n`;
  }

  bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}
