import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Hotel {
  id: string;
  referred_by: string;
  plan_id: string;
  status: string;
}

interface Plan {
  price: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    console.log('Calculating referral earnings for month:', currentMonth);

    // Get all active hotels with referrals
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, referred_by, plan_id, status')
      .not('referred_by', 'is', null)
      .eq('status', 'active');

    if (hotelsError) throw hotelsError;

    console.log(`Found ${hotels?.length || 0} referred hotels to process`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const hotel of hotels || []) {
      try {
        // Get plan price
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('price')
          .eq('id', hotel.plan_id)
          .single();

        if (planError || !plan) {
          console.error(`Failed to get plan for hotel ${hotel.id}:`, planError);
          errors++;
          continue;
        }

        const planAmount = plan.price;
        const commissionAmount = planAmount * 0.10; // 10% commission

        // Insert or update earnings record
        const { error: earningsError } = await supabase
          .from('referral_earnings')
          .upsert(
            {
              referral_id: hotel.referred_by,
              hotel_id: hotel.id,
              month_year: currentMonth,
              plan_amount: planAmount,
              commission_rate: 10.0,
              commission_amount: commissionAmount,
              status: 'pending',
            },
            {
              onConflict: 'referral_id,hotel_id,month_year',
            }
          );

        if (earningsError) {
          console.error(`Failed to create/update earnings for hotel ${hotel.id}:`, earningsError);
          errors++;
        } else {
          // Check if it was an insert or update based on whether the record existed
          const { count } = await supabase
            .from('referral_earnings')
            .select('*', { count: 'exact', head: true })
            .eq('referral_id', hotel.referred_by)
            .eq('hotel_id', hotel.id)
            .eq('month_year', currentMonth);
          
          if (count && count > 0) {
            updated++;
          } else {
            created++;
          }
        }
      } catch (error) {
        console.error(`Error processing hotel ${hotel.id}:`, error);
        errors++;
      }
    }

    console.log(`Earnings calculation complete: ${created} created, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        month: currentMonth,
        processed: hotels?.length || 0,
        created,
        updated,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error calculating referral earnings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});