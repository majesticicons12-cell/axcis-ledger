
INSERT INTO storage.buckets (id, name, public)
VALUES ('notices', 'notices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own notices"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own notices"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own notices"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notices' AND auth.uid()::text = (storage.foldername(name))[1]);
