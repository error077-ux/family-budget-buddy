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
    { command: 'start', description: '🏠 Start & show all commands' },
    { command: 'tx', description: '💸 Add transaction: /tx 500 Groceries @Bank' },
    { command: 'cc', description: '💳 Credit card spend: /cc 500 Shopping @CardName' },
    { command: 'ccpay', description: '💰 Pay credit card: /ccpay 5000 @CardName @Bank' },
    { command: 'loan', description: '📋 Create loan: /loan John 1000' },
    { command: 'repay', description: '💵 Loan repayment: /repay John 500 @Bank' },
    { command: 'ipo', description: '📈 Apply IPO: /ipo Company 15000 100 150' },
    { command: 'summary', description: '📊 View financial summary' },
    { command: 'banks', description: '🏦 List all banks' },
    { command: 'cards', description: '💳 List credit cards' },
    { command: 'loans', description: '📋 List active loans' },
    { command: 'ipos', description: '📈 List IPO applications' },
    { command: 'txlist', description: '📝 Recent transactions' },
    { command: 'addbank', description: '🏦 Add bank: /addbank Name AccNo Balance' },
    { command: 'addcard', description: '💳 Add card: /addcard Name Limit DueDate' },
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

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Get today's date in IST
function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

// Parse transaction command: /tx <amount> <description> [@bank]
function parseTransactionCommand(text: string): { amount: number; description: string; bankName?: string } | null {
  const match = text.match(/^\/tx\s+(\d+(?:\.\d{1,2})?)\s+(.+?)(?:\s+@(\w+))?$/i);
  if (!match) return null;
  return {
    amount: parseFloat(match[1]),
    description: match[2].trim(),
    bankName: match[3]?.trim(),
  };
}

// Parse credit card spend: /cc <amount> <description> [@card]
function parseCCSpendCommand(text: string): { amount: number; description: string; cardName?: string } | null {
  const match = text.match(/^\/cc\s+(\d+(?:\.\d{1,2})?)\s+(.+?)(?:\s+@(\w+))?$/i);
  if (!match) return null;
  return {
    amount: parseFloat(match[1]),
    description: match[2].trim(),
    cardName: match[3]?.trim(),
  };
}

// Parse credit card payment: /ccpay <amount> @<card> [@bank]
function parseCCPayCommand(text: string): { amount: number; cardName: string; bankName?: string } | null {
  const match = text.match(/^\/ccpay\s+(\d+(?:\.\d{1,2})?)\s+@(\w+)(?:\s+@(\w+))?$/i);
  if (!match) return null;
  return {
    amount: parseFloat(match[1]),
    cardName: match[2].trim(),
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

// Parse repay command: /repay <borrower_name> <amount> [@bank]
function parseRepayCommand(text: string): { borrowerName: string; amount: number; bankName?: string } | null {
  const match = text.match(/^\/repay\s+(\w+)\s+(\d+(?:\.\d{1,2})?)(?:\s+@(\w+))?$/i);
  if (!match) return null;
  return {
    borrowerName: match[1].trim(),
    amount: parseFloat(match[2]),
    bankName: match[3]?.trim(),
  };
}

// Parse IPO command: /ipo <company> <amount> <shares> <issue_price> [@bank]
function parseIPOCommand(text: string): { company: string; amount: number; shares: number; issuePrice: number; bankName?: string } | null {
  const match = text.match(/^\/ipo\s+(\w+)\s+(\d+(?:\.\d{1,2})?)\s+(\d+)\s+(\d+(?:\.\d{1,2})?)(?:\s+@(\w+))?$/i);
  if (!match) return null;
  return {
    company: match[1].trim(),
    amount: parseFloat(match[2]),
    shares: parseInt(match[3]),
    issuePrice: parseFloat(match[4]),
    bankName: match[5]?.trim(),
  };
}

// Parse add bank: /addbank <name> <account_number> <opening_balance>
function parseAddBankCommand(text: string): { name: string; accountNumber: string; balance: number } | null {
  const match = text.match(/^\/addbank\s+(\w+)\s+(\w+)\s+(\d+(?:\.\d{1,2})?)$/i);
  if (!match) return null;
  return {
    name: match[1].trim(),
    accountNumber: match[2].trim(),
    balance: parseFloat(match[3]),
  };
}

// Parse add card: /addcard <name> <limit> <due_date>
function parseAddCardCommand(text: string): { name: string; limit: number; dueDate: number } | null {
  const match = text.match(/^\/addcard\s+(\w+)\s+(\d+(?:\.\d{1,2})?)\s+(\d{1,2})$/i);
  if (!match) return null;
  return {
    name: match[1].trim(),
    limit: parseFloat(match[2]),
    dueDate: parseInt(match[3]),
  };
}

// Get default bank
async function getDefaultBank(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('banks')
    .select('id, name')
    .limit(1)
    .maybeSingle();
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
    .maybeSingle();
  if (error) return null;
  return data;
}

// Get default credit card
async function getDefaultCard(): Promise<{ id: string; name: string; outstanding: number; credit_limit: number } | null> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id, name, outstanding, credit_limit')
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

// Get credit card by name
async function getCardByName(name: string): Promise<{ id: string; name: string; outstanding: number; credit_limit: number } | null> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('id, name, outstanding, credit_limit')
    .ilike('name', `%${name}%`)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

// Get person by name
async function getPersonByName(name: string): Promise<{ id: string; name: string; is_self: boolean } | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('id, name, is_self')
    .ilike('name', `%${name}%`)
    .limit(1)
    .maybeSingle();
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

// Get bank balance
async function getBankBalance(bankId: string): Promise<number> {
  const { data: balance } = await supabase.rpc('get_bank_balance', { p_bank_id: bankId });
  return balance || 0;
}

// Add transaction
async function addTransaction(bankId: string, description: string, amount: number, expenseOwner: string) {
  const today = getTodayIST();
  
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

// Credit card spend
async function creditCardSpend(cardId: string, description: string, amount: number) {
  const today = getTodayIST();
  
  // Get card
  const { data: card, error: cardError } = await supabase
    .from('credit_cards')
    .select('outstanding')
    .eq('id', cardId)
    .single();
  
  if (cardError) throw cardError;
  
  // Update outstanding
  const { error: updateError } = await supabase
    .from('credit_cards')
    .update({ outstanding: Number(card.outstanding) + amount })
    .eq('id', cardId);
  
  if (updateError) throw updateError;
  
  // Get any bank for transaction record
  const defaultBank = await getDefaultBank();
  if (!defaultBank) throw new Error('No bank available');
  
  // Create transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      date: today,
      description: `[CC] ${description}`,
      amount,
      expense_owner: 'Me',
      bank_id: defaultBank.id,
    })
    .select()
    .single();
  
  if (txError) throw txError;
  
  return tx;
}

// Credit card payment
async function creditCardPayment(cardId: string, bankId: string, amount: number) {
  const today = getTodayIST();
  
  // Get card
  const { data: card, error: cardError } = await supabase
    .from('credit_cards')
    .select('outstanding, name')
    .eq('id', cardId)
    .single();
  
  if (cardError) throw cardError;
  
  const payAmount = Math.min(amount, Number(card.outstanding));
  
  // Update outstanding
  const { error: updateError } = await supabase
    .from('credit_cards')
    .update({ outstanding: Number(card.outstanding) - payAmount })
    .eq('id', cardId);
  
  if (updateError) throw updateError;
  
  // Debit from bank
  const { error: ledgerError } = await supabase.rpc('add_ledger_entry', {
    p_bank_id: bankId,
    p_date: today,
    p_description: `Credit Card Payment: ${card.name}`,
    p_debit: payAmount,
    p_credit: 0,
    p_reference_type: 'cc_payment',
  });
  
  if (ledgerError) throw ledgerError;
  
  return { payAmount, newOutstanding: Number(card.outstanding) - payAmount };
}

// Get loan for borrower
async function getActiveLoan(borrowerName: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .ilike('borrower_name', `%${borrowerName}%`)
    .eq('is_paid', false)
    .limit(1)
    .maybeSingle();
  
  if (error) return null;
  return data;
}

// Get summary
async function getSummary(): Promise<string> {
  // Get banks with balances
  const { data: banks } = await supabase.from('banks').select('id, name');
  
  let totalBankBalance = 0;
  let bankSummary = '🏦 <b>Banks:</b>\n';
  for (const bank of banks || []) {
    const balance = await getBankBalance(bank.id);
    totalBankBalance += balance;
    bankSummary += `• ${bank.name}: ${formatMoney(balance)}\n`;
  }
  bankSummary += `<b>Total:</b> ${formatMoney(totalBankBalance)}\n`;
  
  // Get credit cards
  const { data: cards } = await supabase.from('credit_cards').select('name, outstanding, credit_limit');
  let totalOutstanding = 0;
  let cardSummary = '\n💳 <b>Credit Cards:</b>\n';
  if (cards && cards.length > 0) {
    for (const card of cards) {
      totalOutstanding += Number(card.outstanding);
      cardSummary += `• ${card.name}: ${formatMoney(card.outstanding)} / ${formatMoney(card.credit_limit)}\n`;
    }
    cardSummary += `<b>Total Outstanding:</b> ${formatMoney(totalOutstanding)}\n`;
  } else {
    cardSummary += '• No credit cards\n';
  }
  
  // Get active loans
  const { data: loans } = await supabase
    .from('loans')
    .select('borrower_name, outstanding_amount')
    .eq('is_paid', false);
  
  let totalLoans = 0;
  let loanSummary = '\n📋 <b>Active Loans:</b>\n';
  if (loans && loans.length > 0) {
    for (const loan of loans) {
      totalLoans += Number(loan.outstanding_amount);
      loanSummary += `• ${loan.borrower_name}: ${formatMoney(loan.outstanding_amount)}\n`;
    }
    loanSummary += `<b>Total:</b> ${formatMoney(totalLoans)}\n`;
  } else {
    loanSummary += '• No active loans\n';
  }
  
  // Get today's spending
  const today = getTodayIST();
  const { data: todayTx } = await supabase
    .from('transactions')
    .select('amount')
    .eq('date', today);
  
  const todayTotal = todayTx?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
  
  // Net worth
  const netWorth = totalBankBalance - totalOutstanding + totalLoans;
  
  const summary = `
${bankSummary}${cardSummary}${loanSummary}
📅 <b>Today's Spending:</b> ${formatMoney(todayTotal)}

💰 <b>Net Worth:</b> ${formatMoney(netWorth)}
<i>(Banks - CC Outstanding + Loans Receivable)</i>
  `;
  
  return summary.trim();
}

// Apply for IPO
async function applyIPO(company: string, amount: number, shares: number, issuePrice: number, bankId: string) {
  const today = getTodayIST();
  
  // Create IPO application
  const { data: ipo, error: ipoError } = await supabase
    .from('ipo_applications')
    .insert({
      company_name: company,
      application_date: today,
      amount,
      shares_applied: shares,
      issue_price: issuePrice,
      bank_id: bankId,
      status: 'APPLIED',
    })
    .select()
    .single();
  
  if (ipoError) throw ipoError;
  
  // Debit from bank (funds on hold)
  const { error: ledgerError } = await supabase.rpc('add_ledger_entry', {
    p_bank_id: bankId,
    p_date: today,
    p_description: `IPO Application: ${company}`,
    p_debit: amount,
    p_credit: 0,
    p_reference_type: 'ipo_application',
    p_reference_id: ipo.id,
  });
  
  if (ledgerError) throw ledgerError;
  
  return ipo;
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
      await setBotCommands();
      
      await sendTelegramMessage(chatId, `
🏦 <b>Budget Planner Bot</b>

<b>💰 Transactions:</b>
• <code>/tx 500 Groceries @HDFC</code> - Bank transaction
• <code>/cc 500 Shopping @Axis</code> - Credit card spend
• <code>/ccpay 5000 @Axis @HDFC</code> - Pay CC bill
• <code>/txlist</code> - Recent transactions

<b>📋 Loans:</b>
• <code>/loan John 1000</code> - Create loan
• <code>/repay John 500 @HDFC</code> - Record repayment
• <code>/loans</code> - List active loans

<b>📈 IPO:</b>
• <code>/ipo TataIPO 15000 100 150 @HDFC</code>
• <code>/ipos</code> - List applications

<b>🏦 Accounts:</b>
• <code>/banks</code> - List banks
• <code>/cards</code> - List credit cards
• <code>/addbank ICICI 1234567890 50000</code>
• <code>/addcard Axis 100000 15</code>

<b>📊 Reports:</b>
• <code>/summary</code> - Financial overview

<i>Tip: @BankName is optional - uses default if not specified</i>
      `);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /banks command
    if (text === '/banks') {
      const { data: banks } = await supabase.from('banks').select('id, name, account_number');
      let response = '🏦 <b>Your Banks:</b>\n\n';
      
      for (const bank of banks || []) {
        const balance = await getBankBalance(bank.id);
        response += `<b>${bank.name}</b>\n`;
        response += `  A/C: ${bank.account_number}\n`;
        response += `  Balance: ${formatMoney(balance)}\n\n`;
      }
      
      if (!banks || banks.length === 0) {
        response = '❌ No banks found.\nUse <code>/addbank Name AccNo Balance</code> to add one.';
      }
      
      await sendTelegramMessage(chatId, response);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /cards command
    if (text === '/cards') {
      const { data: cards } = await supabase.from('credit_cards').select('*');
      let response = '💳 <b>Credit Cards:</b>\n\n';
      
      if (cards && cards.length > 0) {
        for (const card of cards) {
          const available = Number(card.credit_limit) - Number(card.outstanding);
          const utilization = (Number(card.outstanding) / Number(card.credit_limit)) * 100;
          response += `<b>${card.name}</b>\n`;
          response += `  Outstanding: ${formatMoney(card.outstanding)}\n`;
          response += `  Available: ${formatMoney(available)}\n`;
          response += `  Limit: ${formatMoney(card.credit_limit)}\n`;
          response += `  Due: ${card.due_date}th | ${utilization.toFixed(0)}% used\n\n`;
        }
      } else {
        response = '❌ No credit cards found.\nUse <code>/addcard Name Limit DueDate</code> to add one.';
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
        let total = 0;
        for (const loan of loans) {
          total += Number(loan.outstanding_amount);
          response += `<b>${loan.borrower_name}</b>\n`;
          response += `  Outstanding: ${formatMoney(loan.outstanding_amount)}\n`;
          response += `  Principal: ${formatMoney(loan.principal_amount)}\n\n`;
        }
        response += `<b>Total Receivable:</b> ${formatMoney(total)}`;
      } else {
        response = '✅ No active loans!';
      }
      
      await sendTelegramMessage(chatId, response);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /ipos command
    if (text === '/ipos') {
      const { data: ipos } = await supabase
        .from('ipo_applications')
        .select('*')
        .order('application_date', { ascending: false })
        .limit(10);
      
      let response = '📈 <b>IPO Applications:</b>\n\n';
      
      if (ipos && ipos.length > 0) {
        for (const ipo of ipos) {
          const statusEmoji = ipo.status === 'ALLOTTED' ? '✅' : ipo.status === 'REFUNDED' ? '↩️' : '⏳';
          response += `${statusEmoji} <b>${ipo.company_name}</b>\n`;
          response += `  Amount: ${formatMoney(ipo.amount)} | ${ipo.shares_applied} shares\n`;
          response += `  Status: ${ipo.status}\n`;
          if (ipo.shares_allotted) {
            response += `  Allotted: ${ipo.shares_allotted} shares\n`;
          }
          response += '\n';
        }
      } else {
        response = '📈 No IPO applications yet.';
      }
      
      await sendTelegramMessage(chatId, response);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /txlist command
    if (text === '/txlist') {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, banks(name)')
        .order('date', { ascending: false })
        .limit(10);
      
      let response = '📝 <b>Recent Transactions:</b>\n\n';
      
      if (transactions && transactions.length > 0) {
        for (const tx of transactions) {
          const bankName = (tx.banks as any)?.name || 'Unknown';
          response += `📅 ${formatDate(tx.date)}\n`;
          response += `  ${tx.description}\n`;
          response += `  ${formatMoney(tx.amount)} via ${bankName}\n`;
          if (tx.expense_owner !== 'Me') {
            response += `  👤 For: ${tx.expense_owner}\n`;
          }
          response += '\n';
        }
      } else {
        response = '📝 No transactions yet.';
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
    
    // /addbank command
    const addBankParsed = parseAddBankCommand(text);
    if (addBankParsed) {
      // Create bank
      const { data: bank, error: bankError } = await supabase
        .from('banks')
        .insert({
          name: addBankParsed.name,
          account_number: addBankParsed.accountNumber,
        })
        .select()
        .single();
      
      if (bankError) throw bankError;
      
      // Add opening balance
      if (addBankParsed.balance > 0) {
        await supabase.from('bank_ledger').insert({
          bank_id: bank.id,
          date: getTodayIST(),
          description: 'Opening Balance',
          credit: addBankParsed.balance,
          debit: 0,
          balance_after: addBankParsed.balance,
        });
      }
      
      await sendTelegramMessage(chatId, `
✅ <b>Bank Added!</b>

🏦 Name: ${addBankParsed.name}
🔢 A/C: ${addBankParsed.accountNumber}
💰 Balance: ${formatMoney(addBankParsed.balance)}
      `);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /addcard command
    const addCardParsed = parseAddCardCommand(text);
    if (addCardParsed) {
      const { data: card, error: cardError } = await supabase
        .from('credit_cards')
        .insert({
          name: addCardParsed.name,
          credit_limit: addCardParsed.limit,
          due_date: addCardParsed.dueDate,
          outstanding: 0,
        })
        .select()
        .single();
      
      if (cardError) throw cardError;
      
      await sendTelegramMessage(chatId, `
✅ <b>Credit Card Added!</b>

💳 Name: ${addCardParsed.name}
💰 Limit: ${formatMoney(addCardParsed.limit)}
📅 Due Date: ${addCardParsed.dueDate}th
      `);
      
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
      
      const newBalance = await getBankBalance(bank.id);
      
      await sendTelegramMessage(chatId, `
✅ <b>Transaction Added!</b>

💸 Amount: ${formatMoney(txParsed.amount)}
📝 Description: ${txParsed.description}
🏦 Bank: ${bank.name}
💰 New Balance: ${formatMoney(newBalance)}
      `);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /cc command - Credit card spend
    const ccParsed = parseCCSpendCommand(text);
    if (ccParsed) {
      let card = ccParsed.cardName ? await getCardByName(ccParsed.cardName) : await getDefaultCard();
      
      if (!card) {
        await sendTelegramMessage(chatId, `❌ Credit card not found. Use /cards to see available cards.`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      await creditCardSpend(card.id, ccParsed.description, ccParsed.amount);
      
      // Get updated card
      const updatedCard = await getCardByName(card.name);
      const available = Number(updatedCard!.credit_limit) - Number(updatedCard!.outstanding);
      
      await sendTelegramMessage(chatId, `
✅ <b>Credit Card Spend Recorded!</b>

💳 Card: ${card.name}
💸 Amount: ${formatMoney(ccParsed.amount)}
📝 Description: ${ccParsed.description}
📊 Outstanding: ${formatMoney(updatedCard!.outstanding)}
💰 Available: ${formatMoney(available)}
      `);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /ccpay command - Credit card payment
    const ccPayParsed = parseCCPayCommand(text);
    if (ccPayParsed) {
      const card = await getCardByName(ccPayParsed.cardName);
      if (!card) {
        await sendTelegramMessage(chatId, `❌ Credit card not found. Use /cards to see available cards.`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      let bank = ccPayParsed.bankName ? await getBankByName(ccPayParsed.bankName) : await getDefaultBank();
      if (!bank) {
        await sendTelegramMessage(chatId, `❌ Bank not found. Use /banks to see available banks.`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const result = await creditCardPayment(card.id, bank.id, ccPayParsed.amount);
      const newBankBalance = await getBankBalance(bank.id);
      
      await sendTelegramMessage(chatId, `
✅ <b>Credit Card Payment!</b>

💳 Card: ${card.name}
💵 Paid: ${formatMoney(result.payAmount)}
🏦 From: ${bank.name}
📊 CC Outstanding: ${formatMoney(result.newOutstanding)}
💰 Bank Balance: ${formatMoney(newBankBalance)}
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
        const newOutstanding = Number(existingLoan.outstanding_amount) + loanParsed.amount;
        const newPrincipal = Number(existingLoan.principal_amount) + loanParsed.amount;
        
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
      
      const repayAmount = Math.min(repayParsed.amount, Number(loan.outstanding_amount));
      const newOutstanding = Number(loan.outstanding_amount) - repayAmount;
      const isPaid = newOutstanding <= 0;
      
      // Update loan
      await supabase
        .from('loans')
        .update({ outstanding_amount: newOutstanding, is_paid: isPaid })
        .eq('id', loan.id);
      
      // Add credit to bank ledger
      const today = getTodayIST();
      await supabase.rpc('add_ledger_entry', {
        p_bank_id: bank.id,
        p_date: today,
        p_description: `Loan repayment from ${loan.borrower_name}`,
        p_debit: 0,
        p_credit: repayAmount,
        p_reference_type: 'loan_repayment',
        p_reference_id: loan.id,
      });
      
      const newBalance = await getBankBalance(bank.id);
      
      await sendTelegramMessage(chatId, `
💰 <b>Repayment Recorded!</b>

👤 From: ${loan.borrower_name}
💵 Amount: ${formatMoney(repayAmount)}
🏦 To: ${bank.name}
📊 Remaining: ${formatMoney(newOutstanding)}
${isPaid ? '✅ Loan fully paid!' : ''}
💰 Bank Balance: ${formatMoney(newBalance)}
      `);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // /ipo command - Apply for IPO
    const ipoParsed = parseIPOCommand(text);
    if (ipoParsed) {
      let bank = ipoParsed.bankName ? await getBankByName(ipoParsed.bankName) : await getDefaultBank();
      
      if (!bank) {
        await sendTelegramMessage(chatId, `❌ Bank not found. Use /banks to see available banks.`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      await applyIPO(ipoParsed.company, ipoParsed.amount, ipoParsed.shares, ipoParsed.issuePrice, bank.id);
      
      const newBalance = await getBankBalance(bank.id);
      
      await sendTelegramMessage(chatId, `
📈 <b>IPO Application Submitted!</b>

🏢 Company: ${ipoParsed.company}
💰 Amount: ${formatMoney(ipoParsed.amount)}
📊 Shares: ${ipoParsed.shares} @ ₹${ipoParsed.issuePrice}
🏦 Bank: ${bank.name}
💰 New Balance: ${formatMoney(newBalance)}

<i>Funds on hold until allotment</i>
      `);
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Unknown command
    await sendTelegramMessage(chatId, `
❓ <b>Unknown command</b>

Try these:
• <code>/tx 500 Groceries</code> - Add transaction
• <code>/cc 500 Shopping</code> - CC spend
• <code>/loan John 1000</code> - Create loan
• <code>/summary</code> - Financial overview
• <code>/start</code> - All commands
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
