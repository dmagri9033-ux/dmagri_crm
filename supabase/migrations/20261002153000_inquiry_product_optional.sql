-- Allow inquiries without a product (mobile-first capture).
ALTER TABLE public.inquiries
  ALTER COLUMN product_id DROP NOT NULL;
