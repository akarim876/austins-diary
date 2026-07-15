import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Authenticate the caller ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    // Create a client scoped to the caller's JWT (anon key + user token)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    // ── 2. Delete the user via admin API (requires service role key) ─────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('delete-account: deleteUser error', deleteError)
      return json({ error: deleteError.message }, 500)
    }

    return json({ success: true })
  } catch (err) {
    console.error('delete-account: unexpected error', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
