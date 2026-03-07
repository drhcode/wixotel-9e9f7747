import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { timingSafeEqual } from 'https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  full_name: string;
  status: string;
}

// Generate iCal event with guest name for calendar visibility
function generateICalEvent(booking: Booking, roomName: string): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  return `BEGIN:VEVENT
UID:${booking.id}@wixotel.com
DTSTAMP:${now}
DTSTART;VALUE=DATE:${booking.check_in.replace(/-/g, '')}
DTEND;VALUE=DATE:${booking.check_out.replace(/-/g, '')}
SUMMARY:${roomName} - ${booking.full_name}
DESCRIPTION:Room booked
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const roomId = url.searchParams.get('room_id');
    const hotelId = url.searchParams.get('hotel_id');
    const token = url.searchParams.get('token');

    if (!roomId || !hotelId) {
      return new Response(
        JSON.stringify({ error: 'room_id and hotel_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'token is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch room and validate token
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('name, hotel_id, ical_token')
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validToken = room.ical_token;
    if (!validToken || token.length !== validToken.length) {
      console.warn(`Invalid token attempt for room ${roomId}`);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const tokenBuffer = new TextEncoder().encode(token);
    const validBuffer = new TextEncoder().encode(validToken);
    if (!timingSafeEqual(tokenBuffer, validBuffer)) {
      console.warn(`Invalid token attempt for room ${roomId}`);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('name')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel) {
      return new Response(
        JSON.stringify({ error: 'Hotel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch bookings for this room (exclude cancelled)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, full_name, status')
      .eq('room_id', roomId)
      .neq('status', 'cancelled')
      .gte('check_out', thirtyDaysAgo.toISOString().split('T')[0]);
    
    console.log(`Found ${bookings?.length || 0} bookings for room ${roomId}`);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate iCal content
    const events = (bookings || []).map(booking => 
      generateICalEvent(booking, room.name)
    ).join('\n');

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Wixotel//Hotel Management System//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${hotel.name} - ${room.name}
X-WR-TIMEZONE:UTC
${events}
END:VCALENDAR`;

    return new Response(icalContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${hotel.name}-${room.name}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error generating iCal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
