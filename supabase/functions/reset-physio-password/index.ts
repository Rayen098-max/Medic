import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { userId, newPassword, requesterId } = await req.json()

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: requester } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', requesterId)
    .single()

  if (requester?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 })
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (!error) {
    await supabaseAdmin.from('audit_log').insert({
      actor_id: requesterId,
      action: 'password_reset',
      target_id: userId,
    })
  }

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
