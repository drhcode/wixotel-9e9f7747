import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationKey {
  id: string;
  key: string;
  default_value: string;
  namespace_id: string;
}

interface Language {
  code: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting auto-translation process...');

    // Get all active languages except English
    const { data: languages, error: langError } = await supabase
      .from('languages')
      .select('code, name')
      .eq('is_active', true)
      .neq('code', 'en');

    if (langError) throw langError;

    // Get all translation keys
    const { data: translationKeys, error: keysError } = await supabase
      .from('translation_keys')
      .select('id, key, default_value, namespace_id');

    if (keysError) throw keysError;

    let translationsCreated = 0;

    // Process each language
    for (const language of languages as Language[]) {
      console.log(`Processing language: ${language.name} (${language.code})`);

      // Get existing translations for this language
      const { data: existingTranslations } = await supabase
        .from('translations')
        .select('key_id')
        .eq('language_code', language.code);

      const existingKeyIds = new Set(existingTranslations?.map(t => t.key_id) || []);

      // Find missing translations
      const missingKeys = (translationKeys as TranslationKey[]).filter(
        key => !existingKeyIds.has(key.id)
      );

      console.log(`Found ${missingKeys.length} missing translations for ${language.code}`);

      // Translate in batches of 10
      const batchSize = 10;
      for (let i = 0; i < missingKeys.length; i += batchSize) {
        const batch = missingKeys.slice(i, i + batchSize);
        
        // Prepare batch translation request
        const textsToTranslate = batch.map(k => k.default_value).join('\n---\n');
        
        const prompt = `Translate the following English texts to ${language.name}. 
Each text is separated by "---". Return ONLY the translations in the same order, separated by "---". 
Keep any HTML tags, placeholders like {name}, and technical terms unchanged.

${textsToTranslate}`;

        try {
          // Use Lovable AI for translation
          const aiResponse = await fetch('https://api.lovable.dev/v1/ai/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
            },
            body: JSON.stringify({
              model: 'openai/gpt-5-mini',
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.3,
            }),
          });

          if (!aiResponse.ok) {
            console.error(`AI translation failed for batch ${i / batchSize + 1}`);
            continue;
          }

          const aiData = await aiResponse.json();
          const translatedText = aiData.choices[0].message.content;
          const translations = translatedText.split('---').map((t: string) => t.trim());

          // Insert translations
          const translationsToInsert = batch.map((key, idx) => ({
            key_id: key.id,
            language_code: language.code,
            translated_text: translations[idx] || key.default_value,
            is_verified: false,
          }));

          const { error: insertError } = await supabase
            .from('translations')
            .insert(translationsToInsert);

          if (insertError) {
            console.error('Insert error:', insertError);
          } else {
            translationsCreated += translationsToInsert.length;
            console.log(`Inserted ${translationsToInsert.length} translations for ${language.code}`);
          }
        } catch (error) {
          console.error(`Error translating batch for ${language.code}:`, error);
        }

        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Auto-translation completed. Created ${translationsCreated} translations.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        translationsCreated,
        message: `Successfully created ${translationsCreated} translations`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auto-translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
