import { supabase } from '@/integrations/supabase/client';

// ============ TYPES ============
export interface Bank {
  id: string;
  name: string;
  account_number: string;
  balance: number;
  created_at: string;
}

export interface BankLedgerEntry {
  id: string;
  bank_id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  expense_owner: string;
  bank_id: string;
  bank_name?: string;
  created_loan_id: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  borrower_name: string;
  principal_amount: number;
  outstanding_amount: number;
  is_paid: boolean;
  source_type: string;
  source_id: string | null;
  created_at: string;
}

export interface CreditCard {
  id: string;
  name: string;
  credit_limit: number;
  outstanding: number;
  available_credit: number;
  due_date: number;
  created_at: string;
}

export type IPOStatus = 'APPLIED' | 'ALLOTTED' | 'REFUNDED';

export interface IPO {
  id: string;
  company_name: string;
  application_date: string;
  amount: number;
  shares_applied: number;
  shares_allotted: number | null;
  status: IPOStatus;
  bank_id: string;
  bank_name?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  email: string;
  scheduled_date: string;
  is_recurring: boolean;
  recurrence_day: number | null;
  is_sent: boolean;
  created_at: string;
}

export interface AppSettings {
  id: string;
  pin_hash: string;
  created_at: string;
}

// ============ BANKS ============
export const banksApi = {
  getAll: async (): Promise<Bank[]> => {
    const { data: banks, error } = await supabase
      .from('banks')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    // Calculate balance for each bank from ledger
    const banksWithBalance = await Promise.all(
      (banks || []).map(async (bank) => {
        const { data: ledger } = await supabase
          .from('bank_ledger')
          .select('credit, debit')
          .eq('bank_id', bank.id);
        
        const balance = (ledger || []).reduce(
          (acc, entry) => acc + Number(entry.credit) - Number(entry.debit), 0
        );
        
        return { ...bank, balance };
      })
    );
    
    return banksWithBalance;
  },

  getById: async (id: string): Promise<Bank> => {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Calculate balance
    const { data: ledger } = await supabase
      .from('bank_ledger')
      .select('credit, debit')
      .eq('bank_id', id);
    
    const balance = (ledger || []).reduce(
      (acc, entry) => acc + Number(entry.credit) - Number(entry.debit), 0
    );
    
    return { ...data, balance };
  },

  create: async (bank: { name: string; account_number: string; opening_balance?: number }): Promise<Bank> => {
    const { data, error } = await supabase
      .from('banks')
      .insert({ name: bank.name, account_number: bank.account_number })
      .select()
      .single();
    
    if (error) throw error;
    
    let balance = 0;
    // Add opening balance as initial credit if provided
    if (bank.opening_balance && bank.opening_balance > 0) {
      balance = bank.opening_balance;
      await supabase.from('bank_ledger').insert({
        bank_id: data.id,
        date: new Date().toISOString().split('T')[0],
        description: 'Opening Balance',
        credit: bank.opening_balance,
        debit: 0,
        balance_after: bank.opening_balance,
      });
    }
    
    return { ...data, balance };
  },

  update: async (id: string, bank: Partial<{ name: string; account_number: string }>) => {
    const { data, error } = await supabase
      .from('banks')
      .update(bank)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('banks').delete().eq('id', id);
    if (error) throw error;
  },

  getLedger: async (id: string): Promise<BankLedgerEntry[]> => {
    const { data, error } = await supabase
      .from('bank_ledger')
      .select('*')
      .eq('bank_id', id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
};

// ============ TRANSACTIONS ============
export const transactionsApi = {
  getAll: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, banks(name)`)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(t => ({
      ...t,
      bank_name: (t.banks as any)?.name,
    }));
  },

  create: async (tx: {
    date: string;
    description: string;
    amount: number;
    expense_owner: string;
    bank_id: string;
  }): Promise<Transaction & { created_loan_id?: string }> => {
    let createdLoanId: string | null = null;

    // If expense owner is not "Me", create a loan
    if (tx.expense_owner !== 'Me') {
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert({
          borrower_name: tx.expense_owner,
          principal_amount: tx.amount,
          outstanding_amount: tx.amount,
          source_type: 'expense',
        })
        .select()
        .single();
      
      if (loanError) throw loanError;
      createdLoanId = loan.id;
    }

    // Create the transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        expense_owner: tx.expense_owner,
        bank_id: tx.bank_id,
        created_loan_id: createdLoanId,
      })
      .select()
      .single();
    
    if (error) throw error;

    // Update loan source_id if created
    if (createdLoanId) {
      await supabase.from('loans').update({ source_id: data.id }).eq('id', createdLoanId);
    }

    // Add ledger entry (debit from bank)
    const { data: ledgerData } = await supabase
      .from('bank_ledger')
      .select('balance_after')
      .eq('bank_id', tx.bank_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const currentBalance = ledgerData?.[0]?.balance_after || 0;
    
    await supabase.from('bank_ledger').insert({
      bank_id: tx.bank_id,
      date: tx.date,
      description: tx.description,
      debit: tx.amount,
      credit: 0,
      balance_after: Number(currentBalance) - tx.amount,
      reference_type: 'transaction',
      reference_id: data.id,
    });

    return { ...data, created_loan_id: createdLoanId };
  },

  update: async (id: string, tx: Partial<{
    date: string;
    description: string;
    amount: number;
    expense_owner: string;
    bank_id: string;
  }>) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(tx)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============ LOANS ============
export const loansApi = {
  getAll: async (): Promise<Loan[]> => {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  repay: async (id: string, payment: { amount: number; bank_id: string; date: string }) => {
    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single();
    
    if (loanError) throw loanError;
    
    const newOutstanding = Number(loan.outstanding_amount) - payment.amount;
    const isPaid = newOutstanding <= 0;
    
    // Update loan
    const { data, error } = await supabase
      .from('loans')
      .update({
        outstanding_amount: Math.max(0, newOutstanding),
        is_paid: isPaid,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Add credit to bank ledger
    const { data: ledgerData } = await supabase
      .from('bank_ledger')
      .select('balance_after')
      .eq('bank_id', payment.bank_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const currentBalance = ledgerData?.[0]?.balance_after || 0;
    
    await supabase.from('bank_ledger').insert({
      bank_id: payment.bank_id,
      date: payment.date,
      description: `Loan repayment from ${loan.borrower_name}`,
      credit: payment.amount,
      debit: 0,
      balance_after: Number(currentBalance) + payment.amount,
      reference_type: 'loan_repayment',
      reference_id: id,
    });
    
    return data;
  },
};

// ============ CREDIT CARDS ============
export const creditCardsApi = {
  getAll: async (): Promise<CreditCard[]> => {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(card => ({
      ...card,
      available_credit: Number(card.credit_limit) - Number(card.outstanding),
    }));
  },

  create: async (card: { name: string; credit_limit: number; due_date: number }) => {
    const { data, error } = await supabase
      .from('credit_cards')
      .insert(card)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, card: Partial<{ name: string; credit_limit: number; due_date: number }>) => {
    const { data, error } = await supabase
      .from('credit_cards')
      .update(card)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) throw error;
  },

  spend: async (id: string, spend: { date: string; description: string; amount: number; spent_for: string }) => {
    // Get card
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', id)
      .single();
    
    if (cardError) throw cardError;
    
    // Update outstanding
    const { error: updateError } = await supabase
      .from('credit_cards')
      .update({ outstanding: Number(card.outstanding) + spend.amount })
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    // Create loan if spent_for is not "Me"
    if (spend.spent_for !== 'Me') {
      await supabase.from('loans').insert({
        borrower_name: spend.spent_for,
        principal_amount: spend.amount,
        outstanding_amount: spend.amount,
        source_type: 'credit_card',
        source_id: id,
      });
    }
    
    return { success: true };
  },

  pay: async (id: string, payment: { amount: number; bank_id: string; date: string }) => {
    // Get card
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', id)
      .single();
    
    if (cardError) throw cardError;
    
    // Update card outstanding
    const newOutstanding = Math.max(0, Number(card.outstanding) - payment.amount);
    await supabase
      .from('credit_cards')
      .update({ outstanding: newOutstanding })
      .eq('id', id);
    
    // Debit from bank
    const { data: ledgerData } = await supabase
      .from('bank_ledger')
      .select('balance_after')
      .eq('bank_id', payment.bank_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const currentBalance = ledgerData?.[0]?.balance_after || 0;
    
    await supabase.from('bank_ledger').insert({
      bank_id: payment.bank_id,
      date: payment.date,
      description: `Credit card payment - ${card.name}`,
      debit: payment.amount,
      credit: 0,
      balance_after: Number(currentBalance) - payment.amount,
      reference_type: 'cc_payment',
      reference_id: id,
    });
    
    return { success: true };
  },
};

// ============ IPO ============
export const ipoApi = {
  getAll: async (): Promise<IPO[]> => {
    const { data, error } = await supabase
      .from('ipo_applications')
      .select(`*, banks(name)`)
      .order('application_date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(ipo => ({
      ...ipo,
      bank_name: (ipo.banks as any)?.name,
    }));
  },

  apply: async (ipo: {
    company_name: string;
    application_date: string;
    amount: number;
    shares_applied: number;
    bank_id: string;
  }) => {
    // Create IPO application
    const { data, error } = await supabase
      .from('ipo_applications')
      .insert({
        company_name: ipo.company_name,
        application_date: ipo.application_date,
        amount: ipo.amount,
        shares_applied: ipo.shares_applied,
        bank_id: ipo.bank_id,
        status: 'APPLIED',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Debit from bank (funds on hold)
    const { data: ledgerData } = await supabase
      .from('bank_ledger')
      .select('balance_after')
      .eq('bank_id', ipo.bank_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const currentBalance = ledgerData?.[0]?.balance_after || 0;
    
    await supabase.from('bank_ledger').insert({
      bank_id: ipo.bank_id,
      date: ipo.application_date,
      description: `IPO Application - ${ipo.company_name}`,
      debit: ipo.amount,
      credit: 0,
      balance_after: Number(currentBalance) - ipo.amount,
      reference_type: 'ipo_apply',
      reference_id: data.id,
    });
    
    return data;
  },

  allot: async (id: string, allotment: { shares_allotted: number; refund_amount?: number }) => {
    const { data: ipo, error: ipoError } = await supabase
      .from('ipo_applications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (ipoError) throw ipoError;
    
    // Update IPO status
    const { data, error } = await supabase
      .from('ipo_applications')
      .update({
        status: 'ALLOTTED',
        shares_allotted: allotment.shares_allotted,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Add refund to bank if applicable
    if (allotment.refund_amount && allotment.refund_amount > 0) {
      const { data: ledgerData } = await supabase
        .from('bank_ledger')
        .select('balance_after')
        .eq('bank_id', ipo.bank_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const currentBalance = ledgerData?.[0]?.balance_after || 0;
      
      await supabase.from('bank_ledger').insert({
        bank_id: ipo.bank_id,
        date: new Date().toISOString().split('T')[0],
        description: `IPO Refund - ${ipo.company_name}`,
        credit: allotment.refund_amount,
        debit: 0,
        balance_after: Number(currentBalance) + allotment.refund_amount,
        reference_type: 'ipo_refund',
        reference_id: id,
      });
    }
    
    return data;
  },

  refund: async (id: string) => {
    const { data: ipo, error: ipoError } = await supabase
      .from('ipo_applications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (ipoError) throw ipoError;
    
    // Update status
    const { data, error } = await supabase
      .from('ipo_applications')
      .update({ status: 'REFUNDED' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Refund to bank
    const { data: ledgerData } = await supabase
      .from('bank_ledger')
      .select('balance_after')
      .eq('bank_id', ipo.bank_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const currentBalance = ledgerData?.[0]?.balance_after || 0;
    
    await supabase.from('bank_ledger').insert({
      bank_id: ipo.bank_id,
      date: new Date().toISOString().split('T')[0],
      description: `IPO Full Refund - ${ipo.company_name}`,
      credit: ipo.amount,
      debit: 0,
      balance_after: Number(currentBalance) + Number(ipo.amount),
      reference_type: 'ipo_refund',
      reference_id: id,
    });
    
    return data;
  },
};

// ============ NOTIFICATIONS ============
export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('scheduled_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  create: async (notification: {
    title: string;
    message: string;
    email: string;
    scheduled_date: string;
    is_recurring: boolean;
    recurrence_day?: number;
  }) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, notification: Partial<{
    title: string;
    message: string;
    email: string;
    scheduled_date: string;
    is_recurring: boolean;
    recurrence_day: number;
  }>) => {
    const { data, error } = await supabase
      .from('notifications')
      .update(notification)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============ APP SETTINGS (PIN) ============
export const settingsApi = {
  getSettings: async (): Promise<AppSettings | null> => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  setPin: async (pinHash: string) => {
    const existing = await settingsApi.getSettings();
    
    if (existing) {
      const { data, error } = await supabase
        .from('app_settings')
        .update({ pin_hash: pinHash, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('app_settings')
        .insert({ pin_hash: pinHash })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  verifyPin: async (pin: string): Promise<boolean> => {
    const settings = await settingsApi.getSettings();
    if (!settings) return false;
    return settings.pin_hash === hashPin(pin);
  },
};

// Simple hash function for PIN (in production use bcrypt)
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ============ DASHBOARD ============
export const dashboardApi = {
  getStats: async () => {
    const [banks, loans, cards, ipos, transactions] = await Promise.all([
      banksApi.getAll(),
      loansApi.getAll(),
      creditCardsApi.getAll(),
      ipoApi.getAll(),
      transactionsApi.getAll(),
    ]);
    
    return {
      total_balance: banks.reduce((sum, b) => sum + b.balance, 0),
      total_outstanding_loans: loans.filter(l => !l.is_paid).reduce((sum, l) => sum + Number(l.outstanding_amount), 0),
      total_credit_outstanding: cards.reduce((sum, c) => sum + Number(c.outstanding), 0),
      pending_ipos: ipos.filter(i => i.status === 'APPLIED').length,
      recent_transactions: transactions.slice(0, 5),
    };
  },
};
