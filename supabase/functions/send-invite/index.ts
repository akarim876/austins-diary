import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const siteUrl      = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

    // Admin client — uses service role, bypasses RLS
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Caller's JWT — used to identify who sent the invite
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: userErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { profile_id, email, role } = await req.json() as {
      profile_id: string
      email: string
      role: 'editor' | 'viewer'
    }

    if (!profile_id || !email || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the caller is an owner of this profile
    const { data: access, error: accessErr } = await admin
      .from('profile_access')
      .select('role')
      .eq('profile_id', profile_id)
      .eq('user_id', user.id)
      .single()

    if (accessErr || access?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only profile owners can invite caregivers' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upsert the pending invite row
    const { error: inviteRowErr } = await admin.from('profile_invites').upsert({
      profile_id,
      invited_by: user.id,
      email: email.toLowerCase().trim(),
      role,
    }, { onConflict: 'profile_id,email' })

    if (inviteRowErr) {
      return new Response(JSON.stringify({ error: inviteRowErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send the invite email via Supabase Auth.
    // redirectTo lands on /accept-invite so the user is prompted to set a password
    // before entering the app; after setting it they are navigated to /diary.
    const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${siteUrl}/accept-invite`,
        data: { invited_to_profile: profile_id },
      }
    )

    if (emailErr) {
      // The invite row is already saved — return a partial-success so the
      // UI can show the pending invite even if email delivery failed.
      return new Response(
        JSON.stringify({
          ok: false,
          saved: true,
          error: emailErr.message,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ ok: true, saved: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
