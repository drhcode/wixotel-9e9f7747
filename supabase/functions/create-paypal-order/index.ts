import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET_KEY = Deno.env.get("PAYPAL_SECRET_KEY");
const PAYPAL_API_URL = "https://api-m.paypal.com"; // Use https://api-m.sandbox.paypal.com for sandbox

interface CreateOrderRequest {
  invoice_id: string;
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
    const { invoice_id }: CreateOrderRequest = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: "Invoice ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, hotels(name)")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if invoice is already paid
    if (invoice.status === "paid") {
      return new Response(
        JSON.stringify({ error: "Invoice is already paid" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

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
            reference_id: invoice.id,
            description: `WIXOTEL Invoice ${invoice.invoice_number} - ${invoice.hotels?.name || "Hotel Subscription"}`,
            custom_id: invoice.id,
            invoice_id: invoice.invoice_number,
            amount: {
              currency_code: invoice.currency || "EUR",
              value: invoice.total_amount.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: invoice.currency || "EUR",
                  value: invoice.amount.toFixed(2),
                },
                tax_total: {
                  currency_code: invoice.currency || "EUR",
                  value: invoice.tax_amount.toFixed(2),
                },
              },
            },
            items: [
              {
                name: `Subscription - ${invoice.invoice_number}`,
                description: `Billing Period: ${invoice.billing_period_start} to ${invoice.billing_period_end}`,
                quantity: "1",
                unit_amount: {
                  currency_code: invoice.currency || "EUR",
                  value: invoice.amount.toFixed(2),
                },
                category: "DIGITAL_GOODS",
              },
            ],
          },
        ],
        application_context: {
          brand_name: "WIXOTEL",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: `${supabaseUrl}/functions/v1/paypal-capture?invoice_id=${invoice.id}`,
          cancel_url: `${supabaseUrl}/functions/v1/paypal-cancel?invoice_id=${invoice.id}`,
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

    console.log("PayPal order created:", orderData.id);

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        status: orderData.status,
        links: orderData.links,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error creating PayPal order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
