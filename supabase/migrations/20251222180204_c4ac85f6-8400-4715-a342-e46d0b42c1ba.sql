-- Create table for family members/persons
CREATE TABLE public.persons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  is_self boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for all access (PIN-based app, no user auth)
CREATE POLICY "Allow all for persons" ON public.persons
FOR ALL USING (true) WITH CHECK (true);

-- Insert default "Me" person
INSERT INTO public.persons (name, is_self) VALUES ('Me', true);