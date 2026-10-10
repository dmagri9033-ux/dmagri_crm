-- Link auto-created reminders back to follow-ups for idempotent sync.
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS source_followup_id uuid
    REFERENCES public.followups (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reminders_source_followup_id_uidx
  ON public.reminders (source_followup_id)
  WHERE source_followup_id IS NOT NULL AND deleted_at IS NULL;
