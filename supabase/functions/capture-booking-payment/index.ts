import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET_KEY = Deno.env.get("PAYPAL_SECRET_KEY");
const PAYPAL_API_URL = "https://api-m.paypal.com";

interface CaptureBookingRequest {
  order_id: string;
}

const getPayPalAccessToken = async (): Promise<string> => {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`);
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("PayPal auth error:", data);
    throw new Error("Failed to get PayPal access token");
  }

  return data.access_token;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id }: CaptureBookingRequest = await req.json();
    console.log("Capture booking payment for order:", order_id);

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // First, get order details to extract booking info
    const orderDetailsResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${order_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const orderDetails = await orderDetailsResponse.json();
    
    if (!orderDetailsResponse.ok) {
      console.error("Failed to get order details:", orderDetails);
      return new Response(
        JSON.stringify({ error: "Failed to get order details" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract booking data from custom_id
    const customId = orderDetails.purchase_units?.[0]?.custom_id;
    if (!customId) {
      return new Response(
        JSON.stringify({ error: "Invalid order - missing booking data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const bookingData = JSON.parse(customId);
    console.log("Booking data from order:", bookingData);

    // Check room availability one more time before capturing
    const { data: overlapExists, error: overlapError } = await supabase.rpc("check_booking_overlap", {
      p_room_id: bookingData.room_id,
      p_check_in: bookingData.check_in,
      p_check_out: bookingData.check_out,
    });

    if (overlapError) {
      console.error("Final overlap check error:", overlapError);
      return new Response(
        JSON.stringify({ error: "Failed to verify availability" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (overlapExists) {
      console.error("Room became unavailable before payment capture");
      return new Response(
        JSON.stringify({ error: "Room is no longer available. Please choose different dates. Payment was not captured." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Capture the PayPal order
    const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error("PayPal capture error:", captureData);
      return new Response(
        JSON.stringify({ error: "Failed to capture payment", details: captureData }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("PayPal payment captured:", captureData);

    // Check if payment was successful
    if (captureData.status !== "COMPLETED") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: captureData.status,
          message: "Payment not completed" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the total amount from PayPal response
    const totalAmount = parseFloat(
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || "0"
    );

    // Generate confirmation number
    const confirmationNumber = `WIXO${Date.now()}${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

    // Get or create guest record
    let guestId: string;
    
    // Check if guest exists
    const { data: existingGuest } = await supabase
      .from("guests")
      .select("id")
      .eq("hotel_id", bookingData.hotel_id)
      .eq("email", bookingData.email)
      .maybeSingle();

    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      // Create new guest
      const { data: newGuest, error: guestError } = await supabase
        .from("guests")
        .insert({
          hotel_id: bookingData.hotel_id,
          name: bookingData.full_name,
          email: bookingData.email,
          phone: bookingData.phone,
        })
        .select("id")
        .single();

      if (guestError || !newGuest) {
        console.error("Failed to create guest:", guestError);
        return new Response(
          JSON.stringify({ error: "Payment captured but failed to create guest record" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      guestId = newGuest.id;
    }

    // Create the booking directly (bypassing leads since payment is completed)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        hotel_id: bookingData.hotel_id,
        room_id: bookingData.room_id,
        guest_id: guestId,
        full_name: bookingData.full_name,
        guest_email: bookingData.email,
        guest_phone: bookingData.phone,
        check_in: bookingData.check_in,
        check_out: bookingData.check_out,
        guest_count: bookingData.guests,
        total_amount: totalAmount,
        status: "reserved",
        payment_status: "completed",
        confirmation_number: confirmationNumber,
        source: "online_payment",
        notes: `Paid via PayPal. Transaction ID: ${captureData.id}`,
      })
      .select("*, rooms(name, room_number), hotels(name, email, phone, address)")
      .single();

    if (bookingError || !booking) {
      console.error("Failed to create booking:", bookingError);
      return new Response(
        JSON.stringify({ error: "Payment captured but failed to create booking. Please contact support with transaction ID: " + captureData.id }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Booking created successfully:", booking.id);

    // Create notification for hotel
    await supabase.from("notifications").insert({
      hotel_id: bookingData.hotel_id,
      type: "new_booking_paid",
      title: "New Paid Booking",
      message: `${bookingData.full_name} booked ${booking.rooms?.name || "a room"} via PayPal payment. Confirmation: ${confirmationNumber}`,
    });

    // Send confirmation emails
    try {
      // Email to guest
      const guestEmailContent = `
        <h2>Booking Confirmed! ✓</h2>
        <p>Dear ${bookingData.full_name},</p>
        <p>Thank you for your booking at <strong>${booking.hotels?.name || "our hotel"}</strong>. Your payment has been received and your reservation is confirmed!</p>
        
        <div style="background:#f0fdf4;padding:20px;border-radius:8px;border:2px solid #10b981;margin:25px 0;text-align:center;">
          <p style="margin:0 0 8px 0;font-weight:600;">Your Confirmation Number</p>
          <p style="margin:0;font-size:24px;font-weight:700;font-family:monospace;letter-spacing:2px;">${confirmationNumber}</p>
          <p style="margin:8px 0 0 0;font-size:12px;">Save this number for check-in</p>
        </div>

        <p><strong>Booking Details:</strong></p>
        <ul>
          <li><strong>Room:</strong> ${booking.rooms?.name || "N/A"}</li>
          <li><strong>Check-in:</strong> ${bookingData.check_in}</li>
          <li><strong>Check-out:</strong> ${bookingData.check_out}</li>
          <li><strong>Guests:</strong> ${bookingData.guests}</li>
          <li><strong>Total Paid:</strong> €${totalAmount.toFixed(2)}</li>
        </ul>

        <p>We look forward to welcoming you!</p>
        <p>Best regards,<br>${booking.hotels?.name || "The Hotel Team"}</p>
      `;

      await supabase.functions.invoke("send-email", {
        body: {
          hotel_id: bookingData.hotel_id,
          recipient_email: bookingData.email,
          subject: `Booking Confirmed - ${booking.hotels?.name || "Hotel"}`,
          email_type: "booking_confirmation",
          html_content: guestEmailContent,
        },
      });

      // Email to hotel
      if (booking.hotels?.email) {
        const hotelEmailContent = `
          <h2>New Paid Booking Received</h2>
          <p>A new booking has been made and paid via PayPal:</p>
          
          <div style="background:#dbeafe;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;font-weight:600;">Confirmation: ${confirmationNumber}</p>
          </div>

          <p><strong>Guest Details:</strong></p>
          <ul>
            <li><strong>Name:</strong> ${bookingData.full_name}</li>
            <li><strong>Email:</strong> ${bookingData.email}</li>
            <li><strong>Phone:</strong> ${bookingData.phone}</li>
          </ul>

          <p><strong>Booking Details:</strong></p>
          <ul>
            <li><strong>Room:</strong> ${booking.rooms?.name || "N/A"} (${booking.rooms?.room_number || "N/A"})</li>
            <li><strong>Check-in:</strong> ${bookingData.check_in}</li>
            <li><strong>Check-out:</strong> ${bookingData.check_out}</li>
            <li><strong>Guests:</strong> ${bookingData.guests}</li>
            <li><strong>Total Amount:</strong> €${totalAmount.toFixed(2)}</li>
            <li><strong>Payment Status:</strong> <span style="color:#10b981;font-weight:bold;">PAID</span></li>
          </ul>

          <p>This booking is confirmed and has been added to your calendar automatically.</p>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            hotel_id: bookingData.hotel_id,
            recipient_email: booking.hotels.email,
            subject: `New Paid Booking - ${bookingData.full_name}`,
            email_type: "new_booking_notification",
            html_content: hotelEmailContent,
          },
        });
      }
    } catch (emailError) {
      console.error("Error sending confirmation emails:", emailError);
      // Don't fail the response, booking is already created
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        confirmation_number: confirmationNumber,
        transaction_id: captureData.id,
        status: "confirmed",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error capturing booking payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
