import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Room {
  name: string;
  price: number;
  capacity: number;
}

interface Hotel {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
}

interface RegistrationRequest {
  hotel: Hotel;
  rooms: Room[];
  accountEmail: string;
}

// Generate contract text
function generateContractText(hotel: Hotel, rooms: Room[]): string {
  return `
HOTEL PARTNERSHIP AGREEMENT

This agreement is entered into between Wixotel Platform and ${hotel.name}.

Hotel Information:
- Name: ${hotel.name}
- Address: ${hotel.address}, ${hotel.city}, ${hotel.country}
- Phone: ${hotel.phone}
- Email: ${hotel.email}

Room Details:
${rooms.map((room, i) => `${i + 1}. ${room.name} - €${room.price}/night - Capacity: ${room.capacity}`).join('\n')}

Terms and Conditions:

1. COMMISSION STRUCTURE
Platform charges an 8% commission on all confirmed bookings.

2. PARTNER RESPONSIBILITIES
- Maintain accurate room availability
- Respond to inquiries within 24 hours
- Honor all confirmed reservations
- Provide quality service

3. PLATFORM SERVICES
- Booking management system
- Lead generation tools
- Payment tracking
- 24/7 platform support

4. CANCELLATION POLICY
Partner controls cancellation policies. No commission on cancelled bookings.

5. DATA & PRIVACY
Both parties handle guest data responsibly per GDPR compliance.

6. PAYMENT TERMS
Commission due within 30 days of guest check-in.

7. TERMINATION
30 days written notice required from either party.

Date: ${new Date().toLocaleDateString()}

This document serves as confirmation of registration on Wixotel Platform.
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { hotel, rooms, accountEmail }: RegistrationRequest = await req.json();

    console.log(`Sending registration confirmation to ${hotel.email}`);

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

    // Generate contract
    const contractText = generateContractText(hotel, rooms);

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .room-item { background: #f3f4f6; padding: 12px; margin: 8px 0; border-radius: 6px; }
    .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
    .status-badge { background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Registration Received!</h1>
      <p>Thank you for partnering with Wixotel</p>
    </div>
    
    <div class="content">
      <p>Dear ${hotel.name} Team,</p>
      
      <p>We're excited to receive your hotel registration! Your application is now under review by our team.</p>
      
      <div class="status-badge">⏳ Status: Pending Review</div>
      
      <div class="details">
        <h3>📋 Registration Summary</h3>
        
        <div class="detail-row">
          <span class="detail-label">Hotel Name:</span>
          <span>${hotel.name}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span>${hotel.city}, ${hotel.country}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Address:</span>
          <span>${hotel.address}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Phone:</span>
          <span>${hotel.phone}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span>${hotel.email}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Account Email:</span>
          <span>${accountEmail}</span>
        </div>
      </div>
      
      <div class="details">
        <h3>🛏️ Rooms Registered (${rooms.length})</h3>
        ${rooms.map(room => `
          <div class="room-item">
            <strong>${room.name}</strong><br/>
            Price: €${room.price}/night | Capacity: ${room.capacity} guests
          </div>
        `).join('')}
      </div>
      
      <div class="details">
        <h3>📄 Partnership Agreement</h3>
        <p>Attached to this email is a copy of the Hotel Partnership Agreement you accepted during registration. 
        Please keep this for your records.</p>
        
        <p><strong>Key Terms:</strong></p>
        <ul>
          <li>8% commission on confirmed bookings</li>
          <li>24-hour response time for inquiries</li>
          <li>Monthly commission statements</li>
          <li>30-day termination notice period</li>
        </ul>
      </div>
      
      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <strong>⏰ What's Next?</strong><br/>
        Our team will review your application within 24-48 hours. You'll receive an email notification once your hotel is approved and live on our platform.
      </div>
      
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <p>Best regards,<br/>
      <strong>The Wixotel Team</strong></p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Wixotel Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Initialize SMTP client
    const useTLS = smtpSettings.port === 465;
    
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

    // Send email with attachment
    await client.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: hotel.email,
      subject: `🎉 Registration Received - ${hotel.name}`,
      html: emailHtml,
      attachments: [
        {
          filename: "Hotel_Partnership_Agreement.txt",
          content: contractText,
          contentType: "text/plain",
          encoding: "text",
        },
      ],
    });

    await client.close();

    console.log('Registration confirmation sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending registration confirmation:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});