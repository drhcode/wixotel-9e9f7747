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
      throw new Error('Unauthorized: Only super admins can reset passwords');
    }

    console.log('Super admin verified:', caller.id);

    const { owner_id, new_password } = await req.json();

    console.log('Resetting password for user:', owner_id);

    // Validate required fields
    if (!owner_id || !new_password) {
      throw new Error('Missing required fields: owner_id and new_password are required');
    }

    // Validate password requirements
    if (new_password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(new_password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(new_password)) {
      throw new Error('Password must contain at least one number');
    }

    // Update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      owner_id,
      { password: new_password }
    );

    if (error) {
      console.error('Password reset error:', error);
      throw new Error(`Failed to reset password: ${error.message}`);
    }

    console.log('Password reset successful for user:', owner_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset successfully' }),
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