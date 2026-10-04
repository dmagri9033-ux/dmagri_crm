-- Soft-complete follow-ups (hidden from default open list).

ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS followups_completed_at_idx
  ON public.followups (completed_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS followups_open_idx
  ON public.followups (followup_date DESC)
  WHERE completed_at IS NULL AND deleted_at IS NULL;
