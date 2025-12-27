import { bot } from "../bot.js";
import { supabase } from "../services/supabaseService.js";

/* 👀 VIEW CARDS */
export async function viewCards(chatId) {
  const { data, error } = await supabase
    .from("credit_cards")
    .select("id,name,credit_limit,outstanding,due_date");

  if (error || !data?.length) {
    return bot.sendMessage(chatId, "💳 No credit cards found.");
  }

  let msg = "💳 *Credit Cards*\n\n";
  for (const c of data) {
    msg += `• ${c.name}\n  Limit: ₹${c.credit_limit}\n  Outstanding: ₹${c.outstanding}\n  Due Day: ${c.due_date}\n\n`;
  }

  bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

/* 📅 DUE DATES */
export async function dueDates(chatId) {
  const { data } = await supabase
    .from("credit_cards")
    .select("name,due_date");

  if (!data?.length) {
    return bot.sendMessage(chatId, "📅 No cards found.");
  }

  let msg = "📅 *Card Due Dates*\n\n";
  data.forEach(c => (msg += `• ${c.name} : Day ${c.due_date}\n`));

  bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

/* 💸 SELECT CARD TO PAY */
export async function selectCardToPay(chatId) {
  const { data } = await supabase
    .from("credit_cards")
    .select("id,name");

  const keyboard = data.map(c => [
    { text: c.name, callback_data: `CARD_PAY_${c.id}` }
  ]);

  keyboard.push([{ text: "⬅ Back", callback_data: "CREDIT_CARDS" }]);

  bot.sendMessage(chatId, "💸 Select Card", {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/* 💸 PAY CARD (FULL OUTSTANDING) */
export async function payCard(chatId, cardId) {
  const { data: card } = await supabase
    .from("credit_cards")
    .select("name,outstanding")
    .eq("id", cardId)
    .single();

  if (!card || card.outstanding <= 0) {
    return bot.sendMessage(chatId, "✅ No outstanding amount.");
  }

  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Update card outstanding
  await supabase
    .from("credit_cards")
    .update({ outstanding: 0 })
    .eq("id", cardId);

  // 2️⃣ Ledger entry (credit card payment)
  await supabase.from("bank_ledger").insert({
    date: today,
    debit: card.outstanding,
    description: `Credit Card Payment - ${card.name}`,
    reference_type: "credit_card",
    reference_id: cardId
  });

  bot.sendMessage(
    chatId,
    `✅ Paid ${card.name}\n💸 Amount: ₹${card.outstanding}`
  );
}
