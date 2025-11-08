import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OTPRequest {
  email: string;
  hotel_id: string;
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { email, hotel_id }: OTPRequest = await req.json();

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating OTP for ${email} at hotel ${hotel_id}`);

    // Get hotel details
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('name, email')
      .eq('id', hotel_id)
      .single();

    if (hotelError || !hotel) {
      console.error('Hotel not found:', hotelError);
      return new Response(
        JSON.stringify({ error: 'Hotel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for recent OTP requests (rate limiting - 1 per minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOTPs } = await supabase
      .from('booking_otps')
      .select('id')
      .eq('email', email)
      .eq('hotel_id', hotel_id)
      .gte('created_at', oneMinuteAgo);

    if (recentOTPs && recentOTPs.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Please wait 1 minute before requesting another code' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('booking_otps')
      .insert({
        email,
        hotel_id,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

    if (otpError) {
      console.error('Failed to store OTP:', otpError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (smtpError || !smtpSettings) {
      console.error('SMTP settings not configured:', smtpError);
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build email content
    const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #333;">Verify Your Booking Request</h2><p>Hello,</p><p>You requested to book at <strong>${hotel.name}</strong>. Please use the verification code below to complete your booking request:</p><div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 2px solid #10b981; margin: 25px 0; text-align: center;"><p style="margin: 0 0 8px 0; font-weight: 600;">Your Verification Code</p><p style="margin: 0; font-size: 32px; font-weight: 700; font-family: monospace; letter-spacing: 8px;">${otpCode}</p><p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">This code expires in 10 minutes</p></div><p>If you didn't request this code, please ignore this email.</p><p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from ${hotel.name}. Please do not reply to this email.</p></div>`;

    // Initialize SMTP client
    const useTLS = smtpSettings.port === 465;
    console.log(`Sending OTP via SMTP: ${smtpSettings.host}:${smtpSettings.port}`);
    
    const client = new SMTPClient({
      connection: {
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        tls: useTLS,
        auth: {
          username: smtpSettings.username,
          password: smtpSettings.password,
        },
      },
    });

    // Send email
    await client.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: email,
      subject: `Your verification code for ${hotel.name}`,
      html: htmlContent,
    });

    await client.close();

    console.log('OTP sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent to your email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    
    let errorMessage = 'Failed to send verification code';
    if (error.message.includes('authentication failed')) {
      errorMessage = 'Email service authentication failed';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Email service unavailable';
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
