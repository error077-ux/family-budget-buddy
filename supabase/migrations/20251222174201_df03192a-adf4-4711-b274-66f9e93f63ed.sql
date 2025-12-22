-- Add source_bank_id to loans table to track which bank account paid
ALTER TABLE public.loans ADD COLUMN source_bank_id uuid REFERENCES public.banks(id);

-- Add source_credit_card_id to loans table to track if a credit card was used
ALTER TABLE public.loans ADD COLUMN source_credit_card_id uuid REFERENCES public.credit_cards(id);