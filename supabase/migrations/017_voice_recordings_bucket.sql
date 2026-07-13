-- Private bucket for temporary voice recordings used by the transcription feature.
-- Files are uploaded before transcription and deleted immediately afterward.
-- Path convention: {user_id}/{timestamp}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings',
  false,
  15728640,   -- 15 MB per file
  ARRAY[
    'audio/webm', 'audio/ogg', 'audio/mp4',
    'audio/x-m4a', 'audio/mpeg', 'audio/wav'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Users may only access their own folder (first path segment = their user id)
CREATE POLICY "voice_recordings_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "voice_recordings_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "voice_recordings_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
