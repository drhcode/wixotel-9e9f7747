import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  hotel_id: string;
  recipient_email: string;
  subject: string;
  html_content: string;
  email_type: string;
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

    const { hotel_id, recipient_email, subject, html_content, email_type }: EmailRequest = await req.json();

    console.log(`Sending email to ${recipient_email} for hotel ${hotel_id}`);

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (smtpError || !smtpSettings) {
      console.error('SMTP settings not configured:', smtpError);
      
      // Log failed attempt (skip for test emails to avoid FK issues)
      if (email_type !== 'test') {
        await supabase.from('email_logs').insert({
          hotel_id,
          recipient_email,
          subject,
          email_type,
          status: 'failed',
          error_message: 'SMTP settings not configured'
        });
      }

      return new Response(
        JSON.stringify({ error: 'SMTP settings not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize SMTP client with proper TLS configuration
    const useTLS = smtpSettings.port === 465;
    const useSTARTTLS = smtpSettings.port === 587;
    
    console.log(`Configuring SMTP: ${smtpSettings.host}:${smtpSettings.port} (TLS: ${useTLS}, STARTTLS: ${useSTARTTLS})`);
    
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
      to: recipient_email,
      subject: subject,
      html: html_content,
    });

    await client.close();

    console.log('Email sent successfully');

    // Log successful send (skip for test emails)
    if (email_type !== 'test') {
      await supabase.from('email_logs').insert({
        hotel_id,
        recipient_email,
        subject,
        email_type,
        status: 'sent'
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('authentication failed')) {
      errorMessage = 'SMTP authentication failed. Please check your username and password. Gmail users must use App Passwords (see https://support.google.com/accounts/answer/185833)';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Could not connect to SMTP server. Please check host and port settings.';
    } else if (error.message.includes('Invalid port')) {
      errorMessage = 'Invalid port number. Use 587 for STARTTLS or 465 for TLS/SSL.';
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});