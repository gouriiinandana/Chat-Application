-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Chat attachments are publicly accessible" ON storage.objects;

-- Allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
);
