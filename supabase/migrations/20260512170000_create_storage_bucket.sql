-- Create the storage bucket for chunks if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('dcfs-chunks', 'dcfs-chunks', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access for demonstration purposes (backend uses service_role anyway, but good for local)
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'dcfs-chunks');
