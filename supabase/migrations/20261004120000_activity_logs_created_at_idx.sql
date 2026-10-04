-- Speeds daily purge of activity_logs older than today (IST).
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
  ON public.activity_logs (created_at);
