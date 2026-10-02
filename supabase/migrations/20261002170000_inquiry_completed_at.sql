-- Soft-complete inquiries (hidden from default open list).

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS inquiries_completed_at_idx
  ON public.inquiries (completed_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS inquiries_open_idx
  ON public.inquiries (inquiry_date DESC)
  WHERE completed_at IS NULL AND deleted_at IS NULL;
