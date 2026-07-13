import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let storagePath: string | null = null

  try {
    const body = await req.json()
    storagePath = body?.path as string | null

    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Service-role client so we can download from the private bucket
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Download the audio file
    const { data: fileBlob, error: downloadErr } = await supabaseAdmin
      .storage
      .from('voice-recordings')
      .download(storagePath)

    if (downloadErr || !fileBlob) {
      throw new Error(`Failed to download audio: ${downloadErr?.message ?? 'empty file'}`)
    }

    // Detect extension from path for the filename sent to Whisper
    const ext = storagePath.split('.').pop() ?? 'webm'
    const filename = `recording.${ext}`

    // Build the multipart form for Whisper
    const formData = new FormData()
    formData.append('file', fileBlob, filename)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')

    const whisperRes = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}` },
        body: formData,
      },
    )

    // Always attempt to delete the audio file, even if Whisper failed
    await supabaseAdmin.storage.from('voice-recordings').remove([storagePath])
    storagePath = null // mark cleaned up

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      throw new Error(`Whisper API error (${whisperRes.status}): ${errText}`)
    }

    // response_format=text → plain string body, not JSON
    const transcribedText = (await whisperRes.text()).trim()

    return new Response(
      JSON.stringify({ text: transcribedText }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    // If we errored before deleting, clean up now so stale files don't accumulate
    if (storagePath) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        await supabaseAdmin.storage.from('voice-recordings').remove([storagePath])
      } catch {
        // best-effort cleanup, ignore
      }
    }

    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
