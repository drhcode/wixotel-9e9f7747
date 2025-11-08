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

    const { tables, notes } = await req.json();

    // Define all available tables
    const allTables = [
      "hotels",
      "rooms",
      "bookings",
      "guests",
      "leads",
      "earnings",
      "payments",
      "invoices",
      "subscriptions",
      "subscription_plans",
      "reviews",
      "notifications",
      "support_tickets",
      "ticket_replies",
      "cancellation_requests",
      "room_ical_feeds",
      "ical_sync_logs",
      "ical_sync_conflicts",
      "email_logs",
      "page_analytics",
      "smtp_settings",
      "user_roles",
      "profiles"
    ];

    const tablesToBackup = tables?.length > 0 ? tables : allTables;
    const backup: Record<string, any> = {
      metadata: {
        created_at: new Date().toISOString(),
        created_by: user.id,
        tables: tablesToBackup,
        version: "1.0",
        notes: notes || ""
      },
      data: {}
    };

    // Export each table
    for (const table of tablesToBackup) {
      try {
        const { data, error } = await supabaseClient
          .from(table)
          .select("*");

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          backup.data[table] = { error: error.message, records: [] };
        } else {
          backup.data[table] = { records: data || [], count: data?.length || 0 };
        }
      } catch (err) {
        console.error(`Exception backing up table ${table}:`, err);
        backup.data[table] = { error: String(err), records: [] };
      }
    }

    // Convert to JSON
    const backupJson = JSON.stringify(backup, null, 2);
    const backupBlob = new Blob([backupJson], { type: "application/json" });
    
    // Upload to storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.json`;
    const filePath = `${new Date().getFullYear()}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("database-backups")
      .upload(filePath, backupBlob, {
        contentType: "application/json",
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload backup: ${uploadError.message}`);
    }

    // Log the backup
    const { error: logError } = await supabaseClient
      .from("backup_logs")
      .insert({
        created_by: user.id,
        backup_type: "manual",
        tables_included: tablesToBackup,
        file_path: filePath,
        file_size: backupBlob.size,
        status: "completed",
        notes: notes || null
      });

    if (logError) {
      console.error("Failed to log backup:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        file_path: filePath,
        file_size: backupBlob.size,
        tables_count: tablesToBackup.length,
        message: "Backup created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Backup error:", error);
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