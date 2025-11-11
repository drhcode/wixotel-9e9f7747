import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cityName } = await req.json();
    
    if (!cityName) {
      return new Response(
        JSON.stringify({ error: 'City name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch image from Wikipedia/Wikimedia Commons (completely free, no API key needed)
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|pageterms&piprop=original&titles=${encodeURIComponent(cityName)}&origin=*`;
    
    const response = await fetch(wikiSearchUrl);

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.query?.pages;
    
    if (pages) {
      const page = Object.values(pages)[0] as any;
      const imageUrl = page?.original?.source;
      
      if (imageUrl) {
        return new Response(
          JSON.stringify({ 
            imageUrl: imageUrl,
            thumbnail: imageUrl,
            photographer: 'Wikimedia Commons',
            photographerUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(cityName)}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ imageUrl: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching city image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
