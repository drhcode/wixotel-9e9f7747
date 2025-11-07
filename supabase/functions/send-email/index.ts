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

    // Get authenticated user (JWT already verified by verify_jwt = true)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { hotel_id, recipient_email, subject, html_content, email_type }: EmailRequest = await req.json();

    // Validate inputs
    if (!recipient_email || !recipient_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid recipient email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subject || subject.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Subject must be between 1-200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!html_content || html_content.length > 100000) {
      return new Response(
        JSON.stringify({ error: 'Email content must be between 1-100000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is super_admin for test emails
    if (email_type === 'test') {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      if (!roleData) {
        console.error('Unauthorized test email attempt by:', user.id);
        return new Response(
          JSON.stringify({ error: 'Only super admins can send test emails' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Verify hotel ownership for regular emails
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select('id')
        .eq('id', hotel_id)
        .eq('owner_id', user.id)
        .single();

      if (hotelError || !hotel) {
        console.error('Hotel ownership verification failed:', hotelError);
        return new Response(
          JSON.stringify({ error: 'Forbidden: You do not have access to this hotel' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limiting check: max 50 emails per hotel per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentEmails, error: countError } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact', head: true })
        .eq('hotel_id', hotel_id)
        .gte('created_at', oneHourAgo);

      if (countError) {
        console.error('Rate limit check failed:', countError);
      } else if (recentEmails && (recentEmails as any).count >= 50) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Maximum 50 emails per hour.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
    } else if (error.message.includes('Sender address rejected') || error.message.includes('not owned by user')) {
      errorMessage = 'Sender address rejected: The "From Email" must match your authenticated email username. Either use the same email address for both, or configure email aliases in your email provider settings.';
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});