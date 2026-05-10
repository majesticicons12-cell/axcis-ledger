
-- Support requests table (in-app contact form -> emailed to support)
CREATE TABLE public.support_requests (
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

CREATE POLICY "Users insert own support requests"
  ON public.support_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own support requests"
  ON public.support_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all support requests"
  ON public.support_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update support requests"
  ON public.support_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies on profiles so the owner can manage all users
CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all messages/conversations for moderation/analytics
CREATE POLICY "Admins view all conversations"
  ON public.conversations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all messages"
  ON public.messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin stats helper
CREATE OR REPLACE FUNCTION public.admin_user_stats()
RETURNS TABLE(total_users BIGINT, premium_users BIGINT, free_users BIGINT, msgs_this_month BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE plan = 'premium'),
    (SELECT COUNT(*) FROM public.profiles WHERE plan = 'free'),
    (SELECT COUNT(*) FROM public.messages WHERE role = 'user' AND created_at >= date_trunc('month', now()))
$$;
