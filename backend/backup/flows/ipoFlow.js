import { bot } from "../bot.js";
import { supabase } from "../services/supabaseService.js";

/* 📋 VIEW ALL IPOS */
export async function viewIPOs(chatId) {
  const { data } = await supabase
    .from("ipo_applications")
    .select("id, company_name, status, amount, shares_allotted, listing_price");

  if (!data?.length) {
    return bot.sendMessage(chatId, "📈 No IPO records found.");
  }

  let msg = "📈 *IPO Applications*\n\n";
  data.forEach(i => {
    msg += `• ${i.company_name}\n  Status: ${i.status}\n  Amount: ₹${i.amount}\n\n`;
  });

  bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

/* 🔄 SELECT IPO TO UPDATE STATUS */
export async function selectIPOToUpdate(chatId) {
  const { data } = await supabase
    .from("ipo_applications")
    .select("id, company_name");

  const keyboard = data.map(i => [
    { text: i.company_name, callback_data: `IPO_SET_${i.id}` }
  ]);

  keyboard.push([{ text: "⬅ Back", callback_data: "IPO" }]);

  bot.sendMessage(chatId, "🔄 Select IPO", {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/* 🔄 UPDATE STATUS (ALLOTTED / NOT ALLOTTED / LISTED) */
export async function updateIPOStatus(chatId, ipoId) {
  bot.sendMessage(chatId, "Select Status", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Allotted", callback_data: `IPO_STATUS_ALLOTTED_${ipoId}` }],
        [{ text: "❌ Not Allotted", callback_data: `IPO_STATUS_REJECTED_${ipoId}` }],
        [{ text: "📈 Listed", callback_data: `IPO_STATUS_LISTED_${ipoId}` }],
        [{ text: "⬅ Back", callback_data: "IPO" }]
      ]
    }
  });
}

/* 💰 P/L SUMMARY */
export async function ipoPLSummary(chatId) {
  const { data } = await supabase
    .from("ipo_applications")
    .select("amount, shares_allotted, listing_price");

  let profit = 0;

  data?.forEach(i => {
    if (i.shares_allotted && i.listing_price) {
      profit += (i.shares_allotted * i.listing_price) - i.amount;
    }
  });

  bot.sendMessage(
    chatId,
    `💰 *IPO Profit/Loss*\n\nNet P/L: ₹${profit}`,
    { parse_mode: "Markdown" }
  );
}
