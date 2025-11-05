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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting automatic iCal sync for all active feeds...');

    // Fetch all active iCal feeds
    const { data: feeds, error: feedsError } = await supabase
      .from('room_ical_feeds')
      .select('*')
      .eq('is_active', true);

    if (feedsError) {
      throw feedsError;
    }

    if (!feeds || feeds.length === 0) {
      console.log('No active feeds to sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No active feeds to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${feeds.length} active feeds to sync`);

    let successCount = 0;
    let errorCount = 0;

    // Sync each feed
    for (const feed of feeds) {
      try {
        console.log(`Syncing feed ${feed.id} for room ${feed.room_id}...`);
        
        // Call the sync-ical function
        const { data, error } = await supabase.functions.invoke('sync-ical', {
          body: {
            feed_id: feed.id,
            feed_url: feed.feed_url,
            room_id: feed.room_id,
            hotel_id: feed.hotel_id,
            platform: feed.platform,
          },
        });

        if (error) {
          console.error(`Error syncing feed ${feed.id}:`, error);
          errorCount++;
        } else {
          console.log(`Successfully synced feed ${feed.id}:`, data);
          successCount++;
        }
      } catch (feedError) {
        console.error(`Exception syncing feed ${feed.id}:`, feedError);
        errorCount++;
      }
    }

    const result = {
      success: true,
      total_feeds: feeds.length,
      successful: successCount,
      failed: errorCount,
      timestamp: new Date().toISOString(),
    };

    console.log('Automatic sync completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in automatic iCal sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
