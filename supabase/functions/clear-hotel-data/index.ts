import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Clear data request from user: ${user.id}`);

    // Get user's hotel ID
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (hotelError || !hotel) {
      return new Response(
        JSON.stringify({ error: 'Hotel not found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hotelId = hotel.id;
    console.log(`Clearing data for hotel: ${hotelId}`);

    // Delete all bookings for this hotel
    const { error: bookingsError, count: bookingsCount } = await supabase
      .from('bookings')
      .delete({ count: 'exact' })
      .eq('hotel_id', hotelId);

    if (bookingsError) {
      console.error('Error deleting bookings:', bookingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete bookings', details: bookingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleted ${bookingsCount} bookings`);

    // Delete all guests for this hotel
    const { error: guestsError, count: guestsCount } = await supabase
      .from('guests')
      .delete({ count: 'exact' })
      .eq('hotel_id', hotelId);

    if (guestsError) {
      console.error('Error deleting guests:', guestsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete guests', details: guestsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleted ${guestsCount} guests`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully cleared all data`,
        bookingsDeleted: bookingsCount,
        guestsDeleted: guestsCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
