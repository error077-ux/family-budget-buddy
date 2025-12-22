-- Add listing price column for P&L tracking
ALTER TABLE public.ipo_applications 
ADD COLUMN listing_price numeric,
ADD COLUMN issue_price numeric;