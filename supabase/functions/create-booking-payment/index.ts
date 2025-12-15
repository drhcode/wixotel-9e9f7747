import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET_KEY = Deno.env.get("PAYPAL_SECRET_KEY");
const PAYPAL_API_URL = "https://api-m.paypal.com"; // Use https://api-m.sandbox.paypal.com for sandbox

interface BookingPaymentRequest {
  hotel_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  full_name: string;
  email: string;
  phone: string;
  guests: number;
  total_amount: number;
  return_url: string;
  cancel_url: string;
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
    const payload: BookingPaymentRequest = await req.json();
    console.log("Create booking payment request:", payload);

    // Validate required fields
    if (!payload.hotel_id || !payload.room_id || !payload.check_in || !payload.check_out || 
        !payload.full_name || !payload.email || !payload.phone || !payload.total_amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify room exists and get hotel info
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*, hotels(name)")
      .eq("id", payload.room_id)
      .eq("hotel_id", payload.hotel_id)
      .single();

    if (roomError || !room) {
      console.error("Room fetch error:", roomError);
      return new Response(
        JSON.stringify({ error: "Room not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check room availability again server-side
    const { data: overlapExists, error: overlapError } = await supabase.rpc("check_booking_overlap", {
      p_room_id: payload.room_id,
      p_check_in: payload.check_in,
      p_check_out: payload.check_out,
    });

    if (overlapError) {
      console.error("Overlap check error:", overlapError);
      return new Response(
        JSON.stringify({ error: "Failed to check availability" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (overlapExists) {
      return new Response(
        JSON.stringify({ error: "Room is no longer available for selected dates" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate a pending booking reference ID for tracking
    const pendingBookingRef = `PENDING_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Calculate nights
    const checkInDate = new Date(payload.check_in);
    const checkOutDate = new Date(payload.check_out);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    // Create PayPal order
    const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: pendingBookingRef,
            description: `Room Booking at ${room.hotels?.name || "Hotel"} - ${room.name} (${nights} night${nights > 1 ? 's' : ''})`,
            custom_id: JSON.stringify({
              hotel_id: payload.hotel_id,
              room_id: payload.room_id,
              check_in: payload.check_in,
              check_out: payload.check_out,
              full_name: payload.full_name,
              email: payload.email,
              phone: payload.phone,
              guests: payload.guests,
            }),
            amount: {
              currency_code: "EUR",
              value: payload.total_amount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: room.hotels?.name || "Hotel Booking",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: payload.return_url,
          cancel_url: payload.cancel_url,
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order creation error:", orderData);
      return new Response(
        JSON.stringify({ error: "Failed to create PayPal order", details: orderData }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("PayPal booking order created:", orderData.id);

    // Find the approval URL
    const approveLink = orderData.links?.find((link: any) => link.rel === "approve");

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        status: orderData.status,
        approve_url: approveLink?.href,
        pending_ref: pendingBookingRef,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error creating booking payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
