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

// In-memory state for user sessions (for demo; in production use database)
const userSessions: Record<number, { step: string; amount?: number; description?: string; bankId?: string }> = {};

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("Telegram response:", await res.text());
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

async function getBanksKeyboard() {
  const { data: banks } = await supabase.from("banks").select("id, name");
  if (!banks || banks.length === 0) return null;

  const buttons = banks.map((bank) => [{ text: bank.name, callback_data: `bank_${bank.id}` }]);
  buttons.push([{ text: "❌ Cancel", callback_data: "cancel" }]);
  return { inline_keyboard: buttons };
}

async function getPersonsKeyboard() {
  const { data: persons } = await supabase.from("persons").select("id, name, is_self");
  if (!persons || persons.length === 0) return null;

  const buttons = persons.map((person) => [{ 
    text: person.is_self ? `${person.name} (Me)` : person.name, 
    callback_data: `person_${person.name}` 
  }]);
  buttons.push([{ text: "❌ Cancel", callback_data: "cancel" }]);
  return { inline_keyboard: buttons };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update));

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id;
      const data = callback.data;

      // Answer callback to remove loading state
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callback.id }),
      });

      if (data === "cancel") {
        delete userSessions[chatId];
        await sendTelegramMessage(chatId, "❌ Transaction cancelled.");
        return new Response("OK", { status: 200 });
      }

      if (data === "add_transaction") {
        userSessions[chatId] = { step: "amount" };
        await sendTelegramMessage(chatId, "💰 <b>Enter the amount:</b>\n\nType the transaction amount (e.g., 500)");
        return new Response("OK", { status: 200 });
      }

      if (data.startsWith("bank_")) {
        const bankId = data.replace("bank_", "");
        const session = userSessions[chatId];
        if (session && session.step === "bank") {
          session.bankId = bankId;
          session.step = "person";
          const personsKeyboard = await getPersonsKeyboard();
          await sendTelegramMessage(chatId, "👤 <b>Select expense owner:</b>", personsKeyboard);
        }
        return new Response("OK", { status: 200 });
      }

      if (data.startsWith("person_")) {
        const personName = data.replace("person_", "");
        const session = userSessions[chatId];
        if (session && session.step === "person" && session.amount && session.description && session.bankId) {
          // Create transaction
          const { data: bank } = await supabase.from("banks").select("name").eq("id", session.bankId).single();
          
          const { data: tx, error: txError } = await supabase
            .from("transactions")
            .insert({
              amount: session.amount,
              description: session.description,
              bank_id: session.bankId,
              expense_owner: personName,
              date: new Date().toISOString().split("T")[0],
            })
            .select()
            .single();

          if (txError) {
            await sendTelegramMessage(chatId, `❌ Failed: ${txError.message}`);
            delete userSessions[chatId];
            return new Response("OK", { status: 200 });
          }

          // Add ledger entry
          const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", session.bankId);
          const currentBalance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);

          await supabase.from("bank_ledger").insert({
            bank_id: session.bankId,
            date: new Date().toISOString().split("T")[0],
            description: session.description,
            debit: session.amount,
            credit: 0,
            balance_after: currentBalance - session.amount,
            reference_type: "transaction",
            reference_id: tx.id,
          });

          await sendTelegramMessage(
            chatId,
            `✅ <b>Transaction Added!</b>\n\n💰 Amount: ₹${session.amount}\n📝 Description: ${session.description}\n🏦 Bank: ${bank?.name}\n👤 Owner: ${personName}\n💵 New Balance: ₹${(currentBalance - session.amount).toFixed(2)}`
          );
          delete userSessions[chatId];
        }
        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    }

    const message = update.message;
    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // Check if user is in a session flow
    const session = userSessions[chatId];
    if (session) {
      if (session.step === "amount") {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          await sendTelegramMessage(chatId, "❌ Invalid amount. Please enter a valid number:");
          return new Response("OK", { status: 200 });
        }
        session.amount = amount;
        session.step = "description";
        await sendTelegramMessage(chatId, "📝 <b>Enter description:</b>\n\nWhat is this transaction for?");
        return new Response("OK", { status: 200 });
      }

      if (session.step === "description") {
        session.description = text;
        session.step = "bank";
        const banksKeyboard = await getBanksKeyboard();
        if (!banksKeyboard) {
          await sendTelegramMessage(chatId, "❌ No banks found. Please add a bank first.");
          delete userSessions[chatId];
          return new Response("OK", { status: 200 });
        }
        await sendTelegramMessage(chatId, "🏦 <b>Select bank:</b>", banksKeyboard);
        return new Response("OK", { status: 200 });
      }
    }

    // /start command
    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        `🏦 <b>Budget Planner Bot</b>\n\nWelcome! Manage your finances easily.\n\nTap a button below or use commands:`,
        {
          inline_keyboard: [
            [{ text: "📊 Dashboard", callback_data: "cmd_dashboard" }, { text: "➕ Add Transaction", callback_data: "add_transaction" }],
            [{ text: "🏦 Banks", callback_data: "cmd_banks" }, { text: "💳 Cards", callback_data: "cmd_cards" }],
            [{ text: "📋 Loans", callback_data: "cmd_loans" }, { text: "❓ Help", callback_data: "cmd_help" }],
          ],
        }
      );
    }

    // /transaction or /add command - Start interactive flow
    else if (text === "/transaction" || text === "/add") {
      userSessions[chatId] = { step: "amount" };
      await sendTelegramMessage(
        chatId,
        "➕ <b>Add New Transaction</b>\n\n💰 <b>Step 1:</b> Enter the amount:\n\n<i>Type the transaction amount (e.g., 500)</i>",
        { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel" }]] }
      );
    }

    // /help command
    else if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `📋 <b>Available Commands</b>\n\n/dashboard - View financial summary\n/banks - List all banks with balances\n/loans - View pending loans\n/cards - View credit cards\n/transaction - Add new expense (interactive)\n/add - Same as /transaction`
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

    // Handle inline button commands
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
