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
      throw new Error('Unauthorized: Only super admins can delete referral users');
    }

    console.log('Super admin verified:', caller.id);

    const { referral_id, user_id } = await req.json();

    console.log('Deleting referral user:', { referral_id, user_id });

    // Validate required fields
    if (!referral_id || !user_id) {
      throw new Error('Missing required fields: referral_id and user_id are required');
    }

    // Verify the user is a referral
    const { data: referralData, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('id', referral_id)
      .eq('user_id', user_id)
      .single();

    if (referralError || !referralData) {
      console.error('Referral check failed:', referralError);
      throw new Error('Referral not found');
    }

    // Delete the referral record first
    const { error: deleteReferralError } = await supabaseAdmin
      .from('referrals')
      .delete()
      .eq('id', referral_id);

    if (deleteReferralError) {
      console.error('Failed to delete referral record:', deleteReferralError);
      throw new Error(`Failed to delete referral record: ${deleteReferralError.message}`);
    }

    console.log('Referral record deleted');

    // Delete the user role
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);

    if (deleteRoleError) {
      console.error('Failed to delete user role:', deleteRoleError);
      // Continue anyway, as the main goal is to delete the user
    }

    console.log('User role deleted');

    // Delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError);
      throw new Error(`Failed to delete auth user: ${deleteUserError.message}`);
    }

    console.log('Auth user deleted successfully');

    return new Response(
      JSON.stringify({ success: true }),
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
