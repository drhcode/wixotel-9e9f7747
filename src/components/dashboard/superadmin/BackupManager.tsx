import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Download, Database, Loader2, Trash2, FileJson, Upload, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AVAILABLE_TABLES = [
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

export const BackupManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [restoreTables, setRestoreTables] = useState<string[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch backup logs
  const { data: backupLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["backup-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async ({ tables, notes }: { tables: string[]; notes: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-backup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tables, notes }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create backup");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup Created",
        description: "Database backup has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["backup-logs"] });
      setSelectedTables([]);
      setNotes("");
      setSelectAll(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async ({ backupData, selectedTables, mode }: { 
      backupData: any; 
      selectedTables: string[]; 
      mode: "merge" | "replace" 
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restore-backup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ backupData, selectedTables, mode }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore backup");
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Restore Completed",
        description: result.message,
      });
      setShowRestoreDialog(false);
      setRestoreFile(null);
      setRestoreTables([]);
      queryClient.invalidateQueries({ queryKey: ["backup-logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (backup: any) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("database-backups")
        .remove([backup.file_path]);

      if (storageError) throw storageError;

      // Delete log entry
      const { error: logError } = await supabase
        .from("backup_logs")
        .delete()
        .eq("id", backup.id);

      if (logError) throw logError;
    },
    onSuccess: () => {
      toast({
        title: "Backup Deleted",
        description: "Backup has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["backup-logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedTables(checked ? AVAILABLE_TABLES : []);
  };

  const handleTableToggle = (table: string, checked: boolean) => {
    if (checked) {
      setSelectedTables([...selectedTables, table]);
    } else {
      setSelectedTables(selectedTables.filter((t) => t !== table));
      setSelectAll(false);
    }
  };

  const handleCreateBackup = () => {
    const tables = selectedTables.length > 0 ? selectedTables : AVAILABLE_TABLES;
    createBackupMutation.mutate({ tables, notes });
  };

  const handleDownload = async (backup: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("database-backups")
        .download(backup.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.file_path.split("/").pop() || "backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Backup file is being downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast({
        title: "Invalid File",
        description: "Please select a JSON backup file",
        variant: "destructive",
      });
      return;
    }

    setRestoreFile(file);
    
    // Parse file to get available tables
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.data) {
        setRestoreTables(Object.keys(data.data));
        setShowRestoreDialog(true);
      }
    } catch (error) {
      toast({
        title: "Invalid Backup File",
        description: "Could not parse backup file",
        variant: "destructive",
      });
      setRestoreFile(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    try {
      const text = await restoreFile.text();
      const backupData = JSON.parse(text);
      
      restoreBackupMutation.mutate({
        backupData,
        selectedTables: restoreTables,
        mode: restoreMode,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read backup file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Restore from Backup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restore from Backup
          </CardTitle>
          <CardDescription>
            Upload a JSON backup file to restore your database. You can restore all tables or select specific ones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoreBackupMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Backup File
            </Button>
            {restoreFile && (
              <span className="text-sm text-muted-foreground">
                Selected: {restoreFile.name}
              </span>
            )}
          </div>

          {restoreFile && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start gap-2 text-warning">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Warning: This will modify your database</p>
                  <p className="text-xs text-muted-foreground">
                    Make sure you have a recent backup before proceeding. This action cannot be easily undone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Database from Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Configure restore options for: {restoreFile?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Restore Mode</Label>
              <RadioGroup value={restoreMode} onValueChange={(v) => setRestoreMode(v as "merge" | "replace")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="merge" id="merge" />
                  <Label htmlFor="merge" className="font-normal cursor-pointer">
                    <div>
                      <div className="font-medium">Merge (Recommended)</div>
                      <div className="text-xs text-muted-foreground">
                        Add new records without deleting existing data. May cause conflicts if IDs already exist.
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="font-normal cursor-pointer">
                    <div>
                      <div className="font-medium text-destructive">Replace (Dangerous)</div>
                      <div className="text-xs text-muted-foreground">
                        Delete all existing data in selected tables before restoring. This cannot be undone!
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Tables to Restore ({restoreTables.length} available)</Label>
              <ScrollArea className="h-[200px] border rounded-md p-4">
                <div className="grid grid-cols-2 gap-3">
                  {restoreTables.map((table) => (
                    <div key={table} className="flex items-center space-x-2">
                      <Checkbox
                        id={`restore-${table}`}
                        checked={true}
                        disabled
                      />
                      <Label htmlFor={`restore-${table}`} className="text-sm">
                        {table}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                All tables from the backup will be restored. Future updates may allow selective restore.
              </p>
            </div>

            {restoreBackupMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Restoring...</span>
                  <span>Please wait</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreBackupMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoreBackupMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {restoreBackupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Restore Backup
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Create New Backup
          </CardTitle>
          <CardDescription>
            Export database tables to a JSON file. Select specific tables or backup everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-semibold">
                Select All Tables ({AVAILABLE_TABLES.length})
              </Label>
            </div>
            
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_TABLES.map((table) => (
                  <div key={table} className="flex items-center space-x-2">
                    <Checkbox
                      id={table}
                      checked={selectedTables.includes(table)}
                      onCheckedChange={(checked) =>
                        handleTableToggle(table, checked as boolean)
                      }
                    />
                    <Label htmlFor={table} className="text-sm cursor-pointer">
                      {table}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this backup..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleCreateBackup}
            disabled={createBackupMutation.isPending}
            className="w-full"
          >
            {createBackupMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Create Backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>View and download previous backups</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !backupLogs || backupLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No backups found. Create your first backup above.
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {backupLogs.map((backup) => (
                  <Card key={backup.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <FileJson className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {backup.file_path.split("/").pop()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Created: {new Date(backup.created_at).toLocaleString()}</p>
                            <p>Size: {formatFileSize(backup.file_size || 0)}</p>
                            <p>Tables: {backup.tables_included?.length || 0}</p>
                            {backup.notes && <p className="mt-2 italic">"{backup.notes}"</p>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {backup.tables_included?.slice(0, 5).map((table: string) => (
                              <Badge key={table} variant="secondary" className="text-xs">
                                {table}
                              </Badge>
                            ))}
                            {backup.tables_included?.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{backup.tables_included.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(backup)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this backup file. This action cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBackupMutation.mutate(backup)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};