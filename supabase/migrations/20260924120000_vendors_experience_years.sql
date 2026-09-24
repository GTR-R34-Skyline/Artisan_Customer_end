-- Optional artisan experience for product detail / profile enrichment.
-- Safe no-op when the column already exists.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS experience_years integer;

COMMENT ON COLUMN public.vendors.experience_years IS 'Years of craft experience for the artisan; null when unknown.';
