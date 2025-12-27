import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Send message to Telegram
async function sendTelegramMessage(chatId: number, text: string, parseMode = 'HTML') {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });
  return response.json();
}

// Set bot menu commands
async function setBotCommands() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`;
  const commands = [
    { command: 'start', description: '🏠 Start & show help' },
    { command: 'tx', description: '💸 Add transaction: /tx 500 Groceries @Bank' },
    { command: 'loan', description: '📋 Create loan: /loan John 1000' },
    { command: 'repay', description: '💰 Record repayment: /repay John 500 @Bank' },
    { command: 'summary', description: '📊 View financial summary' },
    { command: 'banks', description: '🏦 List all banks with balances' },
    { command: 'loans', description: '📋 List active loans' },
  ];
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands }),
  });
  console.log('Set bot commands:', await response.json());
}

// Format money
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Parse transaction command: /tx <amount> <description> [bank_name]
function parseTransactionCommand(text: string): { amount: number; description: string; bankName?: string } | null {
  const match = text.match(/^\/tx\s+(\d+(?:\.\d{1,2})?)\s+(.+?)(?:\s+@(\w+))?$/i);
  if (!match) return null;
  return {
    amount: parseFloat(match[1]),
    description: match[2].trim(),
    bankName: match[3]?.trim(),
  };
}

// Parse loan command: /loan <borrower_name> <amount>
function parseLoanCommand(text: string): { borrowerName: string; amount: number } | null {
  const match = text.match(/^\/loan\s+(\w+)\s+(\d+(?:\.\d{1,2})?)$/i);
  if (!match) return null;
  return {
    borrowerName: match[1].trim(),
    amount: parseFloat(match[2]),
  };
}

// Parse repay command: /repay <borrower_name> <amount> [bank_name]
function parseRepayCommand(text: string): { borrowerName: string; amount: number; bankName?: string } | null {
  const match = text.match(/^\/repay\s+(\w+)\s+(\d+(?:\.\d{1,2})?)(?:\s+@(\w+))?$/i);
  if (!match) return null;
  return {
    borrowerName: match[1].trim(),
    amount: parseFloat(match[2]),
    bankName: match[3]?.trim(),
  };
}

// Get default bank
async function getDefaultBank(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('banks')
    .select('id, name')
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

// Get bank by name (partial match)
async function getBankByName(name: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('banks')
    .select('id, name')
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

// Get person by name (for loans)
async function getPersonByName(name: string): Promise<{ id: string; name: string; is_self: boolean } | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('id, name, is_self')
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

// Create or get person
async function getOrCreatePerson(name: string): Promise<{ id: string; name: string; is_self: boolean }> {
  const existing = await getPersonByName(name);
  if (existing) return existing;
  
  const { data, error } = await supabase
    .from('persons')
    .insert({ name, is_self: false })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Add transaction
async function addTransaction(bankId: string, description: string, amount: number, expenseOwner: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // Insert transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      date: today,
      description,
      amount,
      expense_owner: expenseOwner,
      bank_id: bankId,
    })
    .select()
    .single();
  
  if (txError) throw txError;
  
  // Add ledger entry (debit)
  const { error: ledgerError } = await supabase.rpc('add_ledger_entry', {
    p_bank_id: bankId,
    p_date: today,
    p_description: `Transaction: ${description}`,
    p_debit: amount,
    p_credit: 0,
    p_reference_type: 'transaction',
    p_reference_id: tx.id,
  });
  
  if (ledgerError) throw ledgerError;
  
  return tx;
}

// Get loan for borrower
async function getActiveLoan(borrowerName: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .ilike('borrower_name', `%${borrowerName}%`)
    .eq('is_paid', false)
    .limit(1)
    .single();
  
  if (error) return null;
  return data;
}

// Get summary
async function getSummary(): Promise<string> {
  // Get banks with balances
  const { data: banks } = await supabase.from('banks').select('id, name');
  
  let bankSummary = '💰 <b>Bank Balances:</b>\n';
  for (const bank of banks || []) {
    const { data: balance } = await supabase.rpc('get_bank_balance', { p_bank_id: bank.id });
    bankSummary += `• ${bank.name}: ${formatMoney(balance || 0)}\n`;
  }
  
  // Get active loans
  const { data: loans } = await supabase
    .from('loans')
    .select('borrower_name, outstanding_amount')
    .eq('is_paid', false);
  
  let loanSummary = '\n📋 <b>Active Loans:</b>\n';
  if (loans && loans.length > 0) {
    for (const loan of loans) {
      loanSummary += `• ${loan.borrower_name}: ${formatMoney(loan.outstanding_amount)}\n`;
    }
  } else {
    loanSummary += '• No active loans\n';
  }
  
  // Get today's transactions
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTx, count } = await supabase
    .from('transactions')
    .select('amount', { count: 'exact' })
    .eq('date', today);
  
  const todayTotal = todayTx?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
  
  const todaySummary = `\n📅 <b>Today's Spending:</b>\n• ${count || 0} transactions totaling ${formatMoney(todayTotal)}`;
  
  return bankSummary + loanSummary + todaySummary;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    
    const message = body.message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const chatId = message.chat.id;
    const text = message.text.trim();
    
    // /start command
    if (text === '/start') {
      // Set bot menu commands
      await setBotCommands();
      
      await sendTelegramMessage(chatId, `
🏦 <b>Welcome to Budget Planner Bot!</b>

<b>Commands:</b>
• <code>/tx [amount] [description] @[bank]</code>
  Add transaction (e.g., /tx 500 Groceries @HDFC)

• <code>/loan [name] [amount]</code>
  Create loan (e.g., /loan John 1000)

• <code>/repay [name] [amount] @[bank]</code>
  Record repayment (e.g., /repay John 500 @HDFC)

• <code>/summary</code>
  View bank balances, loans, today's spending

• <code>/banks</code>
  List all banks

• <code>/loans</code>
  List active loans
      `);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /banks command
    if (text === '/banks') {
      const { data: banks } = await supabase.from('banks').select('id, name');
      let response = '🏦 <b>Your Banks:</b>\n\n';
      
      for (const bank of banks || []) {
        const { data: balance } = await supabase.rpc('get_bank_balance', { p_bank_id: bank.id });
        response += `• <b>${bank.name}</b>: ${formatMoney(balance || 0)}\n`;
      }
      
      if (!banks || banks.length === 0) {
        response = '❌ No banks found. Add banks in the web app first.';
      }
      
      await sendTelegramMessage(chatId, response);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /loans command
    if (text === '/loans') {
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('is_paid', false);
      
      let response = '📋 <b>Active Loans:</b>\n\n';
      
      if (loans && loans.length > 0) {
        for (const loan of loans) {
          response += `• <b>${loan.borrower_name}</b>: ${formatMoney(loan.outstanding_amount)} / ${formatMoney(loan.principal_amount)}\n`;
        }
      } else {
        response = '✅ No active loans!';
      }
      
      await sendTelegramMessage(chatId, response);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /summary command
    if (text === '/summary') {
      const summary = await getSummary();
      await sendTelegramMessage(chatId, summary);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /tx command - Add transaction
    const txParsed = parseTransactionCommand(text);
    if (txParsed) {
      let bank = txParsed.bankName ? await getBankByName(txParsed.bankName) : await getDefaultBank();
      
      if (!bank) {
        await sendTelegramMessage(chatId, `❌ Bank not found. Use /banks to see available banks.`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      await addTransaction(bank.id, txParsed.description, txParsed.amount, 'Me');
      
      // Get new balance
      const { data: newBalance } = await supabase.rpc('get_bank_balance', { p_bank_id: bank.id });
      
      await sendTelegramMessage(chatId, `
✅ <b>Transaction Added!</b>

💸 Amount: ${formatMoney(txParsed.amount)}
📝 Description: ${txParsed.description}
🏦 Bank: ${bank.name}
💰 New Balance: ${formatMoney(newBalance || 0)}
      `);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /loan command - Create loan
    const loanParsed = parseLoanCommand(text);
    if (loanParsed) {
      const person = await getOrCreatePerson(loanParsed.borrowerName);
      
      // Check if loan already exists
      const existingLoan = await getActiveLoan(loanParsed.borrowerName);
      if (existingLoan) {
        // Update existing loan
        const newOutstanding = existingLoan.outstanding_amount + loanParsed.amount;
        const newPrincipal = existingLoan.principal_amount + loanParsed.amount;
        
        await supabase
          .from('loans')
          .update({ outstanding_amount: newOutstanding, principal_amount: newPrincipal })
          .eq('id', existingLoan.id);
        
        await sendTelegramMessage(chatId, `
📋 <b>Loan Updated!</b>

👤 Borrower: ${person.name}
➕ Added: ${formatMoney(loanParsed.amount)}
💰 Total Outstanding: ${formatMoney(newOutstanding)}
        `);
      } else {
        // Create new loan
        await supabase.from('loans').insert({
          borrower_name: person.name,
          principal_amount: loanParsed.amount,
          outstanding_amount: loanParsed.amount,
          source_type: 'expense',
          is_paid: false,
        });
        
        await sendTelegramMessage(chatId, `
📋 <b>Loan Created!</b>

👤 Borrower: ${person.name}
💰 Amount: ${formatMoney(loanParsed.amount)}
        `);
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /repay command - Record repayment
    const repayParsed = parseRepayCommand(text);
    if (repayParsed) {
      const loan = await getActiveLoan(repayParsed.borrowerName);
      
      if (!loan) {
        await sendTelegramMessage(chatId, `❌ No active loan found for "${repayParsed.borrowerName}"`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      let bank = repayParsed.bankName ? await getBankByName(repayParsed.bankName) : await getDefaultBank();
      
      if (!bank) {
        await sendTelegramMessage(chatId, `❌ Bank not found. Use /banks to see available banks.`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const repayAmount = Math.min(repayParsed.amount, loan.outstanding_amount);
      const newOutstanding = loan.outstanding_amount - repayAmount;
      const isPaid = newOutstanding <= 0;
      
      // Update loan
      await supabase
        .from('loans')
        .update({ outstanding_amount: newOutstanding, is_paid: isPaid })
        .eq('id', loan.id);
      
      // Add credit to bank ledger
      const today = new Date().toISOString().split('T')[0];
      await supabase.rpc('add_ledger_entry', {
        p_bank_id: bank.id,
        p_date: today,
        p_description: `Loan repayment from ${loan.borrower_name}`,
        p_debit: 0,
        p_credit: repayAmount,
        p_reference_type: 'loan_repayment',
        p_reference_id: loan.id,
      });
      
      // Get new balance
      const { data: newBalance } = await supabase.rpc('get_bank_balance', { p_bank_id: bank.id });
      
      await sendTelegramMessage(chatId, `
💰 <b>Repayment Recorded!</b>

👤 From: ${loan.borrower_name}
💵 Amount: ${formatMoney(repayAmount)}
🏦 To: ${bank.name}
📊 Remaining: ${formatMoney(newOutstanding)}
${isPaid ? '✅ Loan fully paid!' : ''}
💰 Bank Balance: ${formatMoney(newBalance || 0)}
      `);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Unknown command
    await sendTelegramMessage(chatId, `
❓ Unknown command. Try:
• <code>/tx 500 Groceries @HDFC</code>
• <code>/loan John 1000</code>
• <code>/repay John 500</code>
• <code>/summary</code>
• <code>/banks</code>
• <code>/loans</code>
    `);
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
