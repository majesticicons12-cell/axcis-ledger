-- Phone column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- Password reset OTPs table
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  phone TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
