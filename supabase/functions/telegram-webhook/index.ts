import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getDashboardStats() {
  const { data: banks } = await supabase.from("banks").select("id, name");
  const { data: loans } = await supabase.from("loans").select("*").eq("is_paid", false);
  const { data: creditCards } = await supabase.from("credit_cards").select("*");
  const { data: transactions } = await supabase.from("transactions").select("*").order("date", { ascending: false }).limit(5);

  let totalBalance = 0;
  for (const bank of banks || []) {
    const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", bank.id);
    const balance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);
    totalBalance += balance;
  }

  const totalLoans = (loans || []).reduce((acc, l) => acc + Number(l.outstanding_amount), 0);
  const totalCreditOutstanding = (creditCards || []).reduce((acc, c) => acc + Number(c.outstanding), 0);

  return {
    totalBalance,
    totalLoans,
    totalCreditOutstanding,
    bankCount: banks?.length || 0,
    recentTransactions: transactions || [],
  };
}

async function parseTransactionMessage(text: string) {
  // Format: /add <amount> <description> [bank_name]
  // Example: /add 500 Groceries kvb
  const parts = text.split(" ");
  if (parts.length < 3) return null;

  const amount = parseFloat(parts[1]);
  if (isNaN(amount)) return null;

  const description = parts.slice(2, -1).join(" ") || parts[2];
  const bankName = parts.length > 3 ? parts[parts.length - 1] : null;

  return { amount, description, bankName };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update));

    const message = update.message;
    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // /start command
    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        `🏦 <b>Budget Planner Bot</b>\n\nWelcome! Here are the available commands:\n\n/dashboard - View financial summary\n/banks - List all banks\n/loans - View pending loans\n/add &lt;amount&gt; &lt;description&gt; [bank] - Add transaction\n/help - Show this help message`,
        {
          keyboard: [["/dashboard", "/banks"], ["/loans", "/help"]],
          resize_keyboard: true,
        }
      );
    }

    // /help command
    else if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `📋 <b>Available Commands</b>\n\n/dashboard - View financial summary\n/banks - List all banks with balances\n/loans - View pending loans\n/cards - View credit cards\n/add &lt;amount&gt; &lt;description&gt; [bank] - Add expense\n\n<b>Example:</b>\n/add 500 Groceries kvb`
      );
    }

    // /dashboard command
    else if (text === "/dashboard") {
      const stats = await getDashboardStats();
      const msg = `📊 <b>Dashboard</b>\n\n💰 Total Balance: ₹${stats.totalBalance.toFixed(2)}\n📉 Pending Loans: ₹${stats.totalLoans.toFixed(2)}\n💳 Credit Outstanding: ₹${stats.totalCreditOutstanding.toFixed(2)}\n🏦 Banks: ${stats.bankCount}\n\n<b>Recent Transactions:</b>\n${
        stats.recentTransactions.length > 0
          ? stats.recentTransactions.map((t: any) => `• ₹${t.amount} - ${t.description}`).join("\n")
          : "No recent transactions"
      }`;
      await sendTelegramMessage(chatId, msg);
    }

    // /banks command
    else if (text === "/banks") {
      const { data: banks } = await supabase.from("banks").select("*");
      if (!banks || banks.length === 0) {
        await sendTelegramMessage(chatId, "No banks found.");
        return new Response("OK", { status: 200 });
      }

      let msg = "🏦 <b>Banks</b>\n\n";
      for (const bank of banks) {
        const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", bank.id);
        const balance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);
        msg += `<b>${bank.name}</b>\nBalance: ₹${balance.toFixed(2)}\nA/C: ${bank.account_number}\n\n`;
      }
      await sendTelegramMessage(chatId, msg);
    }

    // /loans command
    else if (text === "/loans") {
      const { data: loans } = await supabase
        .from("loans")
        .select("*, banks:source_bank_id(name), credit_cards:source_credit_card_id(name)")
        .eq("is_paid", false);

      if (!loans || loans.length === 0) {
        await sendTelegramMessage(chatId, "✅ No pending loans!");
        return new Response("OK", { status: 200 });
      }

      let msg = "📋 <b>Pending Loans</b>\n\n";
      for (const loan of loans) {
        const source = loan.banks?.name || loan.credit_cards?.name || "Unknown";
        msg += `<b>${loan.borrower_name}</b>\nAmount: ₹${Number(loan.outstanding_amount).toFixed(2)}\nSource: ${source}\n\n`;
      }
      await sendTelegramMessage(chatId, msg);
    }

    // /cards command
    else if (text === "/cards") {
      const { data: cards } = await supabase.from("credit_cards").select("*");
      if (!cards || cards.length === 0) {
        await sendTelegramMessage(chatId, "No credit cards found.");
        return new Response("OK", { status: 200 });
      }

      let msg = "💳 <b>Credit Cards</b>\n\n";
      for (const card of cards) {
        msg += `<b>${card.name}</b>\nLimit: ₹${Number(card.credit_limit).toFixed(2)}\nOutstanding: ₹${Number(card.outstanding).toFixed(2)}\nDue Date: ${card.due_date}th\n\n`;
      }
      await sendTelegramMessage(chatId, msg);
    }

    // /add command - Add transaction
    else if (text.startsWith("/add ")) {
      const parsed = await parseTransactionMessage(text);
      if (!parsed) {
        await sendTelegramMessage(chatId, "❌ Invalid format.\n\nUse: /add <amount> <description> [bank_name]\nExample: /add 500 Groceries kvb");
        return new Response("OK", { status: 200 });
      }

      // Get bank
      let bank;
      if (parsed.bankName) {
        const { data } = await supabase.from("banks").select("*").ilike("name", `%${parsed.bankName}%`).limit(1).single();
        bank = data;
      }
      if (!bank) {
        const { data } = await supabase.from("banks").select("*").order("name").limit(1).single();
        bank = data;
      }

      if (!bank) {
        await sendTelegramMessage(chatId, "❌ No banks found. Please add a bank first.");
        return new Response("OK", { status: 200 });
      }

      // Get self person
      const { data: selfPerson } = await supabase.from("persons").select("name").eq("is_self", true).single();
      const expenseOwner = selfPerson?.name || "Me";

      // Create transaction
      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          amount: parsed.amount,
          description: parsed.description,
          bank_id: bank.id,
          expense_owner: expenseOwner,
          date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (txError) {
        console.error("Transaction error:", txError);
        await sendTelegramMessage(chatId, `❌ Failed to add transaction: ${txError.message}`);
        return new Response("OK", { status: 200 });
      }

      // Add ledger entry
      const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", bank.id);
      const currentBalance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);

      await supabase.from("bank_ledger").insert({
        bank_id: bank.id,
        date: new Date().toISOString().split("T")[0],
        description: parsed.description,
        debit: parsed.amount,
        credit: 0,
        balance_after: currentBalance - parsed.amount,
        reference_type: "transaction",
        reference_id: tx.id,
      });

      await sendTelegramMessage(
        chatId,
        `✅ <b>Transaction Added</b>\n\nAmount: ₹${parsed.amount}\nDescription: ${parsed.description}\nBank: ${bank.name}\nNew Balance: ₹${(currentBalance - parsed.amount).toFixed(2)}`
      );
    }

    // Unknown command
    else if (text.startsWith("/")) {
      await sendTelegramMessage(chatId, "Unknown command. Use /help to see available commands.");
    }

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
