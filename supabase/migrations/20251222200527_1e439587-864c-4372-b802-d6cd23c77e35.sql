-- Create table to store Telegram bot user sessions
CREATE TABLE public.telegram_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  step TEXT NOT NULL DEFAULT 'idle',
  amount DECIMAL(12,2),
  description TEXT,
  bank_id UUID,
  expense_owner TEXT,
  source_type TEXT DEFAULT 'bank',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for the service role (edge functions use service role)
CREATE POLICY "Allow all for telegram_sessions"
ON public.telegram_sessions
FOR ALL
USING (true)
WITH CHECK (true);