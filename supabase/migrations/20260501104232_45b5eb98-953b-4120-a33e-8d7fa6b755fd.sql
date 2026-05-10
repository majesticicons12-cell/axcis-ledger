-- Add plan_started_at to track when premium subscription began
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_started_at timestamp with time zone;

-- For existing premium users without a start date, default to created_at
UPDATE public.profiles
  SET plan_started_at = COALESCE(plan_started_at, created_at)
  WHERE plan = 'premium' AND plan_started_at IS NULL;