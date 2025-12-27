import { bot } from "../bot.js";
import { supabase } from "../services/supabaseService.js";

/* 👀 ACTIVE LOANS */
export async function viewActiveLoans(chatId) {
  const { data } = await supabase
    .from("loans")
    .select("id, borrower_name, outstanding_amount")
    .eq("is_paid", false);

  if (!data?.length) {
    return bot.sendMessage(chatId, "📄 No active loans.");
  }

  let msg = "📄 *Active Loans*\n\n";
  data.forEach(l => {
    msg += `• ${l.borrower_name}\n  Outstanding: ₹${l.outstanding_amount}\n\n`;
  });

  bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

/* ✅ SELECT LOAN TO MARK PAID */
export async function selectLoanToPay(chatId) {
  const { data } = await supabase
    .from("loans")
    .select("id, borrower_name, outstanding_amount")
    .eq("is_paid", false);

  if (!data?.length) {
    return bot.sendMessage(chatId, "✅ No unpaid loans.");
  }

  const keyboard = data.map(l => [
    {
      text: `${l.borrower_name} (₹${l.outstanding_amount})`,
      callback_data: `LOAN_PAY_${l.id}`
    }
  ]);

  keyboard.push([{ text: "⬅ Back", callback_data: "LOANS" }]);

  bot.sendMessage(chatId, "✅ Select Loan to Mark Paid", {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/* ✅ MARK LOAN PAID */
export async function markLoanPaid(chatId, loanId) {
  const { data: loan } = await supabase
    .from("loans")
    .select("borrower_name, outstanding_amount")
    .eq("id", loanId)
    .single();

  if (!loan) {
    return bot.sendMessage(chatId, "❌ Loan not found.");
  }

  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Update loan
  await supabase
    .from("loans")
    .update({
      outstanding_amount: 0,
      is_paid: true
    })
    .eq("id", loanId);

  // 2️⃣ Ledger entry
  await supabase.from("bank_ledger").insert({
    date: today,
    debit: loan.outstanding_amount,
    description: `Loan Paid - ${loan.borrower_name}`,
    reference_type: "loan",
    reference_id: loanId
  });

  bot.sendMessage(
    chatId,
    `✅ Loan Cleared\n${loan.borrower_name}\n₹${loan.outstanding_amount}`
  );
}

/* 📜 LOAN HISTORY */
export async function loanHistory(chatId) {
  const { data } = await supabase
    .from("loans")
    .select("borrower_name, principal_amount, is_paid")
    .order("created_at", { ascending: false });

  if (!data?.length) {
    return bot.sendMessage(chatId, "📜 No loan history.");
  }

  let msg = "📜 *Loan History*\n\n";
  data.forEach(l => {
    msg += `• ${l.borrower_name}\n  Amount: ₹${l.principal_amount}\n  Status: ${l.is_paid ? "Paid" : "Unpaid"}\n\n`;
  });

  bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}
