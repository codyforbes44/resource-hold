
-- Knowledge documents table
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  status text NOT NULL DEFAULT 'pending',
  chunk_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Knowledge chunks table with vector embedding
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS knowledge_documents_user_id_idx ON public.knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_user_id_idx ON public.knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_document_id_idx ON public.knowledge_chunks(document_id);

-- RLS for knowledge_documents
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON public.knowledge_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.knowledge_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.knowledge_documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.knowledge_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS for knowledge_chunks
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chunks"
  ON public.knowledge_chunks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chunks"
  ON public.knowledge_chunks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chunks"
  ON public.knowledge_chunks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
  _user_id uuid,
  _query_embedding vector,
  _match_count integer DEFAULT 5,
  _match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    kc.chunk_index,
    (1 - (kc.embedding <=> _query_embedding))::float AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.user_id = _user_id
    AND (1 - (kc.embedding <=> _query_embedding)) > _match_threshold
  ORDER BY kc.embedding <=> _query_embedding
  LIMIT _match_count;
END;
$$;

-- Storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge_documents', 'knowledge_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload knowledge docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view knowledge docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete knowledge docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge_documents' AND (storage.foldername(name))[1] = auth.uid()::text);
