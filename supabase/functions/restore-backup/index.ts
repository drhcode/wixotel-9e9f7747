import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify user is super admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "super_admin") {
      throw new Error("Unauthorized: Super admin access required");
    }

    const { backupData, selectedTables, mode } = await req.json();

    // Validate backup data structure
    if (!backupData || !backupData.data || !backupData.metadata) {
      throw new Error("Invalid backup file format");
    }

    console.log("Starting restore operation...", {
      tables: selectedTables,
      mode,
      backupVersion: backupData.metadata.version
    });

    const results: Record<string, any> = {};
    const tablesToRestore = selectedTables && selectedTables.length > 0 
      ? selectedTables 
      : Object.keys(backupData.data);

    // Process each table
    for (const table of tablesToRestore) {
      console.log(`Processing table: ${table}`);
      
      try {
        const tableData = backupData.data[table];
        
        if (!tableData || !tableData.records || tableData.records.length === 0) {
          results[table] = {
            success: true,
            message: "No records to restore",
            inserted: 0,
            errors: 0
          };
          continue;
        }

        const records = tableData.records;
        
        // If mode is 'replace', delete existing data first (dangerous!)
        if (mode === 'replace') {
          console.log(`Clearing existing data from ${table}...`);
          const { error: deleteError } = await supabaseClient
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
          
          if (deleteError) {
            console.error(`Error clearing ${table}:`, deleteError);
            results[table] = {
              success: false,
              message: `Failed to clear table: ${deleteError.message}`,
              inserted: 0,
              errors: 1
            };
            continue;
          }
        }

        // Insert records in batches
        const batchSize = 100;
        let totalInserted = 0;
        let totalErrors = 0;
        const errors: string[] = [];

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          const { data, error } = await supabaseClient
            .from(table)
            .insert(batch)
            .select();

          if (error) {
            console.error(`Error inserting batch in ${table}:`, error);
            totalErrors += batch.length;
            errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
          } else {
            totalInserted += data?.length || 0;
          }
        }

        results[table] = {
          success: totalErrors === 0,
          message: totalErrors > 0 
            ? `Partially restored with ${totalErrors} errors`
            : "Successfully restored",
          inserted: totalInserted,
          errors: totalErrors,
          errorDetails: errors.length > 0 ? errors : undefined
        };

        console.log(`Completed ${table}:`, results[table]);

      } catch (err) {
        console.error(`Exception restoring table ${table}:`, err);
        results[table] = {
          success: false,
          message: String(err),
          inserted: 0,
          errors: 1
        };
      }
    }

    // Calculate summary
    const summary = {
      totalTables: tablesToRestore.length,
      successfulTables: Object.values(results).filter((r: any) => r.success).length,
      failedTables: Object.values(results).filter((r: any) => !r.success).length,
      totalRecordsInserted: Object.values(results).reduce((sum: number, r: any) => sum + r.inserted, 0),
      totalErrors: Object.values(results).reduce((sum: number, r: any) => sum + r.errors, 0)
    };

    return new Response(
      JSON.stringify({
        success: summary.failedTables === 0,
        summary,
        results,
        message: summary.failedTables === 0 
          ? `Successfully restored ${summary.totalRecordsInserted} records from ${summary.totalTables} tables`
          : `Completed with ${summary.failedTables} failed tables and ${summary.totalErrors} errors`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Restore error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});