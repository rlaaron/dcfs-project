CREATE OR REPLACE FUNCTION public.increment_node_usage(p_node_id UUID, p_size BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.nodes
  SET current_usage = current_usage + p_size
  WHERE id = p_node_id;
END;
$$;
