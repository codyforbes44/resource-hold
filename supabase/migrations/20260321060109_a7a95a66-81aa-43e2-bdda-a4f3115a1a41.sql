
-- Taskade integration tables

CREATE TABLE public.taskade_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id text,
  default_project_id text,
  default_folder_id text,
  enabled_features jsonb DEFAULT '["tasks","projects","agents"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.taskade_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own taskade config" ON public.taskade_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own taskade config" ON public.taskade_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own taskade config" ON public.taskade_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all taskade configs" ON public.taskade_configs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.taskade_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  status text NOT NULL DEFAULT 'success',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.taskade_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs" ON public.taskade_sync_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sync logs" ON public.taskade_sync_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all sync logs" ON public.taskade_sync_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_taskade_configs_updated_at BEFORE UPDATE ON public.taskade_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
