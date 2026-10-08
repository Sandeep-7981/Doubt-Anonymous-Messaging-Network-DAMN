
-- 1. Add attachment columns to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT, -- 'image' | 'video' | 'audio'
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Allow message to be empty when there's an attachment
ALTER TABLE public.chat_messages ALTER COLUMN message DROP NOT NULL;

-- 2. Add email to profiles so admins can see flagged users' emails
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Update handle_new_user trigger to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END;
$function$;

-- 3. Create storage bucket for chat attachments (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Chat attachments are publicly viewable" ON storage.objects;
CREATE POLICY "Chat attachments are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Add reporter info to admin reports query via FK-like relationship already handled in app;
-- Ensure reports.reported_by can be joined to profiles via user_id in client query.
