ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Reuse chat-attachments bucket for answer attachments as well (already public)