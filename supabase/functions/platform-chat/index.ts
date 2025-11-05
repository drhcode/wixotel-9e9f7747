import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a helpful assistant for a hotel management platform called Wixotel. You help hotel staff understand and use the platform effectively.

Platform Features:
- Dashboard Overview: View key metrics like total bookings, active rooms, pending check-ins, and leads
- Rooms Manager: Create and manage room types with details, amenities, and pricing
- Bookings Manager: View and manage all reservations with check-in/check-out dates
- Calendar Manager: Visual timeline view of all bookings across rooms with drag-and-drop functionality
- Guests Manager: Track all guest information and booking history
- Leads Manager: Manage potential customers and their inquiries
- Conflicts Manager: Identify and resolve booking conflicts or double-bookings
- Earnings Manager: Track revenue and financial metrics
- iCal Manager: Sync with external booking platforms via iCal feeds
- Support: Get help and submit tickets
- Profile Settings: Update hotel information, contact details, and settings

Key Workflows:
1. Adding Rooms: Go to Rooms tab → Add room details, amenities, pricing
2. Managing Bookings: Bookings tab shows all reservations, click to view/edit details
3. Calendar View: Visual timeline shows room availability, drag bookings to reschedule
4. Guest Management: Track guest history and preferences
5. Lead Follow-up: Convert leads to bookings, mark as lost/converted

Tips:
- Keep room information updated for accurate availability
- Regularly check the conflicts manager to avoid double-bookings
- Use the calendar for quick overview of occupancy
- Enable iCal sync to connect with other booking platforms
- Check notifications for new leads and booking updates

Always be concise, helpful, and platform-specific in your responses. If asked about features outside the platform, politely redirect to platform-related topics.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Platform chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
