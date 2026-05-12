-- =============================================================================
-- AXCIS Ledger — Full Schema Migration
-- Run this in your Supabase SQL Editor (public schema).
-- =============================================================================

-- 0. Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT UNIQUE,
  country TEXT DEFAULT 'IN',
  currency TEXT DEFAULT 'INR',
  profile_type TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_renews_on DATE,
  plan_started_at TIMESTAMPTZ,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  mode TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at);

-- 6. Transactions (income / expense tracker)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  note TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tx_user_date ON public.transactions(user_id, occurred_on DESC);

-- 7. Support requests
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- 8. History items (saved notice analyses & ITR sessions)
CREATE TABLE IF NOT EXISTS public.history_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('notice','itr')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.history_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_history_user_created ON public.history_items(user_id, created_at DESC);

-- 9. User roles (admin)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 10. Password reset OTPs (WhatsApp reset)
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  phone TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- 11. Helper: check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 12. Helper: monthly message count for usage tracking
CREATE OR REPLACE FUNCTION public.monthly_message_count(_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.messages
  WHERE user_id = _user_id
    AND role = 'user'
    AND created_at >= date_trunc('month', now());
$$;

-- 13. Admin stats
CREATE OR REPLACE FUNCTION public.admin_user_stats()
RETURNS TABLE(total_users BIGINT, premium_users BIGINT, free_users BIGINT, msgs_this_month BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE plan = 'premium'),
    (SELECT COUNT(*) FROM public.profiles WHERE plan = 'free'),
    (SELECT COUNT(*) FROM public.messages WHERE role = 'user' AND created_at >= date_trunc('month', now()))
$$;

-- 14. Admin function: toggle user premium plan
CREATE OR REPLACE FUNCTION public.admin_toggle_premium(target_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_plan TEXT;
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT plan INTO current_plan FROM public.profiles WHERE user_id = target_user_id;

  IF current_plan IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  IF current_plan = 'premium' THEN
    UPDATE public.profiles
    SET plan = 'free', plan_started_at = NULL
    WHERE user_id = target_user_id;
    result = jsonb_build_object('success', true, 'plan', 'free');
  ELSE
    UPDATE public.profiles
    SET plan = 'premium', plan_started_at = now()
    WHERE user_id = target_user_id;
    result = jsonb_build_object('success', true, 'plan', 'premium');
  END IF;

  RETURN result;
END;
$$;

-- 15. RLS policies

-- Profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Conversations
DROP POLICY IF EXISTS "Own conversations select" ON public.conversations;
CREATE POLICY "Own conversations select" ON public.conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own conversations insert" ON public.conversations;
CREATE POLICY "Own conversations insert" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own conversations update" ON public.conversations;
CREATE POLICY "Own conversations update" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own conversations delete" ON public.conversations;
CREATE POLICY "Own conversations delete" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all conversations" ON public.conversations;
CREATE POLICY "Admins view all conversations" ON public.conversations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Messages
DROP POLICY IF EXISTS "Own messages select" ON public.messages;
CREATE POLICY "Own messages select" ON public.messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own messages insert" ON public.messages;
CREATE POLICY "Own messages insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own messages delete" ON public.messages;
CREATE POLICY "Own messages delete" ON public.messages FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all messages" ON public.messages;
CREATE POLICY "Admins view all messages" ON public.messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Transactions
DROP POLICY IF EXISTS "Own tx select" ON public.transactions;
CREATE POLICY "Own tx select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own tx insert" ON public.transactions;
CREATE POLICY "Own tx insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own tx update" ON public.transactions;
CREATE POLICY "Own tx update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own tx delete" ON public.transactions;
CREATE POLICY "Own tx delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Support requests
DROP POLICY IF EXISTS "Users insert own support requests" ON public.support_requests;
CREATE POLICY "Users insert own support requests" ON public.support_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own support requests" ON public.support_requests;
CREATE POLICY "Users view own support requests" ON public.support_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all support requests" ON public.support_requests;
CREATE POLICY "Admins view all support requests" ON public.support_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update support requests" ON public.support_requests;
CREATE POLICY "Admins update support requests" ON public.support_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- History items
DROP POLICY IF EXISTS "Own history select" ON public.history_items;
CREATE POLICY "Own history select" ON public.history_items FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own history insert" ON public.history_items;
CREATE POLICY "Own history insert" ON public.history_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own history delete" ON public.history_items;
CREATE POLICY "Own history delete" ON public.history_items FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all history" ON public.history_items;
CREATE POLICY "Admins view all history" ON public.history_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 16. Storage bucket for notices
INSERT INTO storage.buckets (id, name, public)
VALUES ('notices', 'notices', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own notices" ON storage.objects;
CREATE POLICY "Users upload own notices" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users read own notices" ON storage.objects;
CREATE POLICY "Users read own notices" ON storage.objects FOR SELECT
  USING (bucket_id = 'notices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own notices" ON storage.objects;
CREATE POLICY "Users delete own notices" ON storage.objects FOR DELETE
  USING (bucket_id = 'notices' AND auth.uid()::text = (storage.foldername(name))[1]);
