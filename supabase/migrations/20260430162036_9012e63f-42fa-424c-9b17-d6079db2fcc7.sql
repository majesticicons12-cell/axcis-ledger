CREATE TABLE public.history_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('notice','itr')),
  title text NOT NULL,
  content text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.history_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own history select" ON public.history_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own history insert" ON public.history_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own history delete" ON public.history_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all history" ON public.history_items FOR SELECT USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_history_user_created ON public.history_items(user_id, created_at DESC);