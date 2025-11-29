import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  email: string;
  full_name: string;
  type: 'approved' | 'rejected';
  referral_code?: string;
  password?: string;
  rejection_reason?: string;
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

    const { email, full_name, type, referral_code, password, rejection_reason }: NotificationRequest = await req.json();

    console.log(`Sending ${type} notification to ${email}`);

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

    let htmlContent: string;
    let subject: string;

    if (type === 'approved') {
      subject = 'Referral Application Approved - Welcome to WIXOTEL!';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">🎉 Congratulations ${full_name}!</h2>
          <p>Your application to become a referral partner with <strong>WIXOTEL</strong> has been approved!</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 2px solid #10b981; margin: 25px 0;">
            <p style="margin: 0 0 8px 0; font-weight: 600;">Your Referral Code</p>
            <p style="margin: 0; font-size: 24px; font-weight: 700; font-family: monospace; letter-spacing: 2px;">${referral_code}</p>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin-top: 0;">Your Login Credentials</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p style="color: #dc2626; font-size: 14px;">⚠️ Please change your password after your first login</p>
          </div>

          <h3>What's Next?</h3>
          <ul>
            <li>Log in to your dashboard using the credentials above</li>
            <li>Share your referral code with potential hotel partners</li>
            <li>Earn 10% commission on every successful referral</li>
            <li>Track your earnings and referred hotels in real-time</li>
          </ul>

          <p><a href="https://wixotel.com/auth" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Login to Dashboard</a></p>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">Welcome to the WIXOTEL partner program! If you have any questions, please contact our support team.</p>
        </div>
      `;
    } else {
      subject = 'Referral Application Update';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Referral Application Update</h2>
          <p>Dear ${full_name},</p>
          <p>Thank you for your interest in becoming a referral partner with <strong>WIXOTEL</strong>.</p>
          <p>After careful review, we are unable to approve your application at this time.</p>
          
          ${rejection_reason ? `
            <div style="background: #fee; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p style="margin: 0; font-weight: 600;">Reason:</p>
              <p style="margin: 5px 0 0 0;">${rejection_reason}</p>
            </div>
          ` : ''}

          <p>We appreciate your interest and encourage you to reapply in the future if circumstances change.</p>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
        </div>
      `;
    }

    // Initialize SMTP client
    const useTLS = smtpSettings.port === 465;
    console.log(`Sending notification via SMTP: ${smtpSettings.host}:${smtpSettings.port}`);
    
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
      subject: subject,
      html: htmlContent,
    });

    await client.close();

    console.log('Notification sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending notification:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
