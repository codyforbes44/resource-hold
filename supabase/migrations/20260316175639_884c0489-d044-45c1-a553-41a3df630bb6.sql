
-- Global model access defaults
CREATE TABLE public.model_access_defaults (
  model text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  visitor_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.model_access_defaults ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage model defaults"
  ON public.model_access_defaults FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- All authenticated users can read defaults
CREATE POLICY "Authenticated users can read model defaults"
  ON public.model_access_defaults FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can read defaults (for visitor access check)
CREATE POLICY "Anon can read model defaults"
  ON public.model_access_defaults FOR SELECT
  TO anon
  USING (true);

-- Seed all models
INSERT INTO public.model_access_defaults (model, enabled, visitor_enabled) VALUES
  ('google/gemini-3-flash-preview', true, true),
  ('google/gemini-2.5-flash', true, true),
  ('google/gemini-2.5-pro', true, false),
  ('google/gemini-2.5-flash-lite', true, true),
  ('google/gemini-3.1-pro-preview', true, false),
  ('openai/gpt-5-mini', true, false),
  ('openai/gpt-5', true, false),
  ('openai/gpt-5-nano', true, true),
  ('openai/gpt-5.2', true, false),
  ('zephel/zephel', true, true),
  ('zephel/zephel-pro', true, false),
  ('zephel/zephel-fast', true, true);

-- Per-user model overrides
CREATE TABLE public.user_model_overrides (
  user_id uuid NOT NULL,
  model text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, model)
);

ALTER TABLE public.user_model_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can manage all overrides
CREATE POLICY "Admins can manage user model overrides"
  ON public.user_model_overrides FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can read their own overrides
CREATE POLICY "Users can read their own model overrides"
  ON public.user_model_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger to model_access_defaults
CREATE TRIGGER update_model_access_defaults_updated_at
  BEFORE UPDATE ON public.model_access_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
