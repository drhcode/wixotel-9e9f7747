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

    // Verify caller is authenticated and is a super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error('Auth verification error:', authError);
      throw new Error('Unauthorized: Invalid token');
    }

    console.log('Caller authenticated:', caller.id);

    // Check if caller has super_admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin')
      .single();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError);
      throw new Error('Unauthorized: Only super admins can create referral users');
    }

    console.log('Super admin verified:', caller.id);

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

    let userId: string;

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;

      // Check if user already has a referral record
      const { data: existingReferral } = await supabaseAdmin
        .from("referrals")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingReferral) {
        throw new Error('This user is already a referral partner');
      }

      // Check if user already has a role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (existingRole && existingRole.role !== 'referral') {
        throw new Error(`This user already has a different role: ${existingRole.role}`);
      }
    } else {
      // Create the auth user
      const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

      if (createAuthError) {
        console.error('Auth error:', createAuthError);
        throw new Error(`Failed to create auth user: ${createAuthError.message}`);
      }
      if (!authData.user) {
        throw new Error("Failed to create user - no user data returned");
      }

      console.log('Auth user created:', authData.user.id);
      userId = authData.user.id;
    }

    // Create referral record
    const { error: referralError } = await supabaseAdmin
      .from("referrals")
      .insert({
        user_id: userId,
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

    // Check if role already exists before inserting
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", userId)
      .single();

    if (roleCheck) {
      // Update existing role to referral
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: "referral" })
        .eq("user_id", userId);

      if (roleUpdateError) {
        console.error('Role update error:', roleUpdateError);
        throw new Error(`Failed to update role: ${roleUpdateError.message}`);
      }
      console.log('Referral role updated successfully');
    } else {
      // Insert new role
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "referral",
        });

      if (roleInsertError) {
        console.error('Role insert error:', roleInsertError);
        throw new Error(`Failed to assign referral role: ${roleInsertError.message}`);
      }
      console.log('Referral role assigned successfully');
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    const status = error.message?.includes('Unauthorized') ? 403 : 400;
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});