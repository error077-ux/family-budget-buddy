-- =============================================
-- FAMILY BUDGET PLANNER DATABASE SCHEMA
-- =============================================

-- Banks table
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Bank ledger for tracking all transactions
CREATE TABLE public.bank_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_ledger ENABLE ROW LEVEL SECURITY;

-- Transactions/Expenses table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_owner TEXT NOT NULL DEFAULT 'Me',
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  created_loan_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Loans table (auto-created when expense_owner != 'Me')
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_name TEXT NOT NULL,
  principal_amount DECIMAL(12,2) NOT NULL,
  outstanding_amount DECIMAL(12,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  source_type TEXT NOT NULL DEFAULT 'expense',
  source_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Credit Cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  credit_limit DECIMAL(12,2) NOT NULL,
  outstanding DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- IPO Applications table
CREATE TYPE public.ipo_status AS ENUM ('APPLIED', 'ALLOTTED', 'REFUNDED');

CREATE TABLE public.ipo_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL,
  shares_applied INTEGER NOT NULL,
  shares_allotted INTEGER,
  status public.ipo_status NOT NULL DEFAULT 'APPLIED',
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ipo_applications ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_day INTEGER,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- App settings for PIN (single user system)
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (Public access for single-user app)
-- Since this is a single-user personal finance app with PIN auth,
-- we'll allow public access but protect via PIN authentication
-- =============================================

CREATE POLICY "Allow all for banks" ON public.banks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for bank_ledger" ON public.bank_ledger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for loans" ON public.loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for credit_cards" ON public.credit_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for ipo_applications" ON public.ipo_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to compute bank balance from ledger
CREATE OR REPLACE FUNCTION public.get_bank_balance(p_bank_id UUID)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(credit) - SUM(debit), 0)
  INTO v_balance
  FROM public.bank_ledger
  WHERE bank_id = p_bank_id;
  
  RETURN v_balance;
END;
$$;

-- Function to add ledger entry and update balance
CREATE OR REPLACE FUNCTION public.add_ledger_entry(
  p_bank_id UUID,
  p_date DATE,
  p_description TEXT,
  p_debit DECIMAL(12,2) DEFAULT 0,
  p_credit DECIMAL(12,2) DEFAULT 0,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL(12,2);
  v_new_balance DECIMAL(12,2);
  v_entry_id UUID;
BEGIN
  v_current_balance := public.get_bank_balance(p_bank_id);
  v_new_balance := v_current_balance + p_credit - p_debit;
  
  INSERT INTO public.bank_ledger (bank_id, date, description, debit, credit, balance_after, reference_type, reference_id)
  VALUES (p_bank_id, p_date, p_description, p_debit, p_credit, v_new_balance, p_reference_type, p_reference_id)
  RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
END;
$$;