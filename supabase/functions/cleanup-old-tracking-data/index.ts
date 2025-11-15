import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Cleanup] Starting 90-day data retention cleanup for leads tracking data');

    // Calculate the cutoff date (90 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`[Cleanup] Removing tracking data for leads older than: ${cutoffDateStr}`);

    // Update old leads to remove tracking data (GDPR 90-day retention policy)
    const { data: updatedLeads, error: updateError } = await supabase
      .from('leads')
      .update({
        ip_address: null,
        device_type: null,
        browser: null,
        user_agent: null,
      })
      .lt('created_at', cutoffDateStr)
      .not('ip_address', 'is', null) // Only update records that have tracking data
      .select('id');

    if (updateError) {
      console.error('[Cleanup] Error updating leads:', updateError);
      throw updateError;
    }

    const clearedCount = updatedLeads?.length || 0;
    console.log(`[Cleanup] Successfully cleared tracking data from ${clearedCount} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleared tracking data from ${clearedCount} leads older than 90 days`,
        clearedCount,
        cutoffDate: cutoffDateStr,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Cleanup] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
