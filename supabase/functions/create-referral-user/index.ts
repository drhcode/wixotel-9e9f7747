import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { full_name, email, password, phone, referral_code } = await req.json();

    console.log('Creating referral user for:', email);

    // Validate required fields
    if (!full_name || !email || !password || !referral_code) {
      throw new Error('Missing required fields: full_name, email, password, and referral_code are required');
    }

    // Validate password requirements
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('Password must contain at least one symbol');
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error("Failed to create user - no user data returned");
    }

    console.log('Auth user created:', authData.user.id);

    // Create referral record
    const { error: referralError } = await supabaseAdmin
      .from("referrals")
      .insert({
        user_id: authData.user.id,
        referral_code,
        full_name,
        email,
        phone: phone || null,
      });

    if (referralError) {
      console.error('Referral insert error:', referralError);
      throw new Error(`Failed to create referral record: ${referralError.message}`);
    }

    console.log('Referral record created');

    // Assign referral role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "referral",
      });

    if (roleError) {
      console.error('Role insert error:', roleError);
      throw new Error(`Failed to assign referral role: ${roleError.message}`);
    }

    console.log('Referral role assigned successfully');

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
