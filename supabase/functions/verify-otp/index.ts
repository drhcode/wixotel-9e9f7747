import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILED_ATTEMPTS = 5;

interface VerifyRequest {
  email: string;
  hotel_id: string;
  otp_code: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, hotel_id, otp_code }: VerifyRequest = await req.json();

    if (!email || !hotel_id || !otp_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying OTP for ${email} at hotel ${hotel_id}`);

    // Find the most recent valid (unexpired, unverified) OTP for this email/hotel
    const { data: otps, error: otpError } = await supabase
      .from('booking_otps')
      .select('*')
      .eq('email', email)
      .eq('hotel_id', hotel_id)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError) {
      console.error('Error fetching OTP:', otpError);
      return new Response(
        JSON.stringify({ error: 'Verification failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otps || otps.length === 0) {
      console.log('No valid OTP found for this email/hotel');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otp = otps[0];

    // Check if too many failed attempts
    if (otp.failed_attempts >= MAX_FAILED_ATTEMPTS) {
      console.log(`OTP locked due to too many failed attempts: ${otp.failed_attempts}`);
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new verification code.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the OTP code matches
    if (otp.otp_code !== otp_code) {
      // Increment failed attempts counter
      const { error: updateError } = await supabase
        .from('booking_otps')
        .update({ failed_attempts: otp.failed_attempts + 1 })
        .eq('id', otp.id);

      if (updateError) {
        console.error('Error updating failed attempts:', updateError);
      }

      const remainingAttempts = MAX_FAILED_ATTEMPTS - (otp.failed_attempts + 1);
      console.log(`Invalid OTP code. Remaining attempts: ${remainingAttempts}`);
      
      return new Response(
        JSON.stringify({ 
          error: remainingAttempts > 0 
            ? `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
            : 'Too many failed attempts. Please request a new verification code.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP is valid - mark as verified
    const { error: updateError } = await supabase
      .from('booking_otps')
      .update({ verified: true })
      .eq('id', otp.id);

    if (updateError) {
      console.error('Error updating OTP:', updateError);
      return new Response(
        JSON.stringify({ error: 'Verification failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OTP verified successfully');

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return new Response(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
