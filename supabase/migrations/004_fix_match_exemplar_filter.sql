CREATE OR REPLACE FUNCTION public.match_exemplar_chunks(
  query_embedding extensions.vector(1536),
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_section TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  section TEXT,
  source_file TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.content,
    ec.section,
    ec.source_file,
    1 - (ec.embedding <=> query_embedding) AS similarity
  FROM public.exemplar_chunks ec
  WHERE
    (
      (filter_user_id IS NULL AND ec.user_id IS NULL)
      OR (filter_user_id IS NOT NULL AND ec.user_id = filter_user_id)
    )
    AND (filter_section IS NULL OR ec.section = filter_section)
  ORDER BY ec.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
