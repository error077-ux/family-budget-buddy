-- Create storage bucket for transaction bills
INSERT INTO storage.buckets (id, name, public) 
VALUES ('transaction-bills', 'transaction-bills', true);

-- Create storage policies for transaction bills
CREATE POLICY "Anyone can view transaction bills"
ON storage.objects FOR SELECT
USING (bucket_id = 'transaction-bills');

CREATE POLICY "Anyone can upload transaction bills"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transaction-bills');

CREATE POLICY "Anyone can update transaction bills"
ON storage.objects FOR UPDATE
USING (bucket_id = 'transaction-bills');

CREATE POLICY "Anyone can delete transaction bills"
ON storage.objects FOR DELETE
USING (bucket_id = 'transaction-bills');

-- Add bill_image_url column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN bill_image_url TEXT;