-- Add allotment_date column to ipo_applications table
ALTER TABLE public.ipo_applications 
ADD COLUMN allotment_date date;