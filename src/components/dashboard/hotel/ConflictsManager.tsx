import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Calendar, CheckCircle2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Conflict {
  id: string;
  platform: string;
  external_check_in: string;
  external_check_out: string;
  external_summary: string;
  external_uid: string;
  external_description: string | null;
  conflicting_booking_id: string | null;
  resolution_status: string;
  resolution_notes: string | null;
  detected_at: string;
  resolved_at: string | null;
  room_id: string;
  feed_id: string;
  rooms: {
    name: string;
    room_number: string | null;
  } | null;
  bookings: {
    full_name: string;
    check_in: string;
    check_out: string;
    confirmation_number: string | null;
  } | null;
}

interface ConflictsManagerProps {
  hotelId: string;
}

export default function ConflictsManager({ hotelId }: ConflictsManagerProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"unresolved" | "resolved">("unresolved");

  useEffect(() => {
    fetchConflicts();
  }, [hotelId, activeTab]);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ical_sync_conflicts")
        .select(`
          *,
          rooms (
            name,
            room_number
          ),
          bookings (
            full_name,
            check_in,
            check_out,
            confirmation_number
          )
        `)
        .eq("hotel_id", hotelId)
        .eq("resolution_status", activeTab === "unresolved" ? "unresolved" : "resolved")
        .order("detected_at", { ascending: false });

      if (error) throw error;
      setConflicts((data || []) as Conflict[]);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      toast.error("Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict) return;

    try {
      const { error } = await supabase
        .from("ical_sync_conflicts")
        .update({
          resolution_status: "resolved",
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", selectedConflict.id);

      if (error) throw error;

      toast.success("Conflict marked as resolved");
      setIsResolveDialogOpen(false);
      setSelectedConflict(null);
      setResolutionNotes("");
      fetchConflicts();
    } catch (error) {
      console.error("Error resolving conflict:", error);
      toast.error("Failed to resolve conflict");
    }
  };

  const openResolveDialog = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setResolutionNotes(conflict.resolution_notes || "");
    setIsResolveDialogOpen(true);
  };

  const getRoomDisplay = (conflict: Conflict) => {
    if (!conflict.rooms) return "Unknown Room";
    return `${conflict.rooms.name}${conflict.rooms.room_number ? ` (${conflict.rooms.room_number})` : ""}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendar Sync Conflicts</h2>
        <p className="text-muted-foreground">
          View and manage external booking conflicts that couldn't be imported
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "unresolved" | "resolved")}>
        <TabsList>
          <TabsTrigger value="unresolved" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unresolved
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Resolved
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {conflicts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {activeTab === "unresolved"
                      ? "No unresolved conflicts. All external bookings are syncing smoothly!"
                      : "No resolved conflicts yet."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            conflicts.map((conflict) => (
              <Card key={conflict.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline">{conflict.platform}</Badge>
                        {conflict.external_summary}
                      </CardTitle>
                      <CardDescription>
                        Detected {format(new Date(conflict.detected_at), "PPp")}
                      </CardDescription>
                    </div>
                    {activeTab === "unresolved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResolveDialog(conflict)}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        External Booking Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">Room:</span>{" "}
                          <span className="font-medium">{getRoomDisplay(conflict)}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Check-in:</span>{" "}
                          <span className="font-medium">
                            {format(new Date(conflict.external_check_in), "PP")}
                          </span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Check-out:</span>{" "}
                          <span className="font-medium">
                            {format(new Date(conflict.external_check_out), "PP")}
                          </span>
                        </p>
                        {conflict.external_description && (
                          <p>
                            <span className="text-muted-foreground">Description:</span>{" "}
                            <span className="text-sm">{conflict.external_description}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">UID: {conflict.external_uid}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Conflicting Reservation
                      </h4>
                      {conflict.bookings ? (
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Guest:</span>{" "}
                            <span className="font-medium">{conflict.bookings.full_name}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Check-in:</span>{" "}
                            <span className="font-medium">
                              {format(new Date(conflict.bookings.check_in), "PP")}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Check-out:</span>{" "}
                            <span className="font-medium">
                              {format(new Date(conflict.bookings.check_out), "PP")}
                            </span>
                          </p>
                          {conflict.bookings.confirmation_number && (
                            <p className="text-xs text-muted-foreground">
                              Confirmation: {conflict.bookings.confirmation_number}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Conflicting booking details not available
                        </p>
                      )}
                    </div>
                  </div>

                  {conflict.resolution_notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-semibold mb-1">Resolution Notes:</p>
                      <p className="text-sm text-muted-foreground">{conflict.resolution_notes}</p>
                      {conflict.resolved_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Resolved {format(new Date(conflict.resolved_at), "PPp")}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Conflict as Resolved</DialogTitle>
            <DialogDescription>
              Add notes about how this conflict was resolved (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Resolution Notes</Label>
              <Textarea
                id="notes"
                placeholder="E.g., Contacted guest, cancelled external booking, manually adjusted dates..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>Mark as Resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
