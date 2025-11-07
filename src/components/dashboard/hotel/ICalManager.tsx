import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Copy, Trash2, Plus, ExternalLink, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { mapDatabaseError } from "@/lib/errorUtils";

interface ICalManagerProps {
  hotelId: string;
}

interface Room {
  id: string;
  name: string;
  room_number: string | null;
}

interface ICalFeed {
  id: string;
  room_id: string;
  platform: string;
  feed_url: string;
  is_active: boolean;
  last_synced_at: string | null;
  sync_status: string;
  sync_error: string | null;
}

export function ICalManager({ hotelId }: ICalManagerProps) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [feeds, setFeeds] = useState<ICalFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New feed form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [platform, setPlatform] = useState("");
  const [feedUrl, setFeedUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, [hotelId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name, room_number")
        .eq("hotel_id", hotelId)
        .order("name");

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      // Fetch iCal feeds
      const { data: feedsData, error: feedsError } = await supabase
        .from("room_ical_feeds")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false });

      if (feedsError) throw feedsError;
      setFeeds(feedsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load iCal feeds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getICalUrl = (roomId: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/generate-ical?room_id=${roomId}&hotel_id=${hotelId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "iCal URL copied to clipboard",
    });
  };

  const handleAddFeed = async () => {
    if (!selectedRoom || !platform || !feedUrl) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      const url = new URL(feedUrl);
      if (!url.protocol.startsWith('http')) {
        toast({
          title: "Invalid URL",
          description: "URL must start with https://",
          variant: "destructive",
        });
        return;
      }
      if (!url.pathname.toLowerCase().endsWith('.ics')) {
        toast({
          title: "Invalid iCal URL",
          description: "URL must end with .ics (iCalendar format)",
          variant: "destructive",
        });
        return;
      }
    } catch (e) {
      toast({
        title: "Invalid URL",
        description: "Please enter a complete URL starting with https://",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("room_ical_feeds").insert({
        hotel_id: hotelId,
        room_id: selectedRoom,
        platform,
        feed_url: feedUrl,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "External calendar added successfully",
      });

      setShowAddForm(false);
      setSelectedRoom("");
      setPlatform("");
      setFeedUrl("");
      fetchData();
    } catch (error) {
      console.error("Error adding feed:", error);
      toast({
        title: "Error",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
    }
  };

  const handleSyncFeed = async (feed: ICalFeed) => {
    setSyncing(feed.id);
    try {
      const { data, error } = await supabase.functions.invoke("sync-ical", {
        body: {
          feed_id: feed.id,
          feed_url: feed.feed_url,
          room_id: feed.room_id,
          hotel_id: hotelId,
          platform: feed.platform,
        },
      });

      if (error) throw error;

      toast({
        title: "Sync complete",
        description: `Processed ${data.events_processed} events, created ${data.bookings_created} bookings, ${data.conflicts_detected || 0} conflicts`,
      });

      fetchData();
    } catch (error) {
      console.error("Error syncing feed:", error);
      toast({
        title: "Sync failed",
        description: "Failed to sync calendar. Check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncByPlatform = async (platformName: string) => {
    const platformFeeds = feeds.filter(f => f.platform === platformName && f.is_active);
    
    if (platformFeeds.length === 0) {
      toast({
        title: "No calendars found",
        description: `No active ${platformName === "booking" ? "Booking.com" : "Airbnb"} calendars to sync`,
        variant: "destructive",
      });
      return;
    }

    setSyncing(`platform-${platformName}`);
    let successCount = 0;
    let failCount = 0;

    for (const feed of platformFeeds) {
      try {
        const { error } = await supabase.functions.invoke("sync-ical", {
          body: {
            feed_id: feed.id,
            feed_url: feed.feed_url,
            room_id: feed.room_id,
            hotel_id: hotelId,
            platform: feed.platform,
          },
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Error syncing feed ${feed.id}:`, error);
        failCount++;
      }
    }

    toast({
      title: "Sync complete",
      description: `Synced ${successCount} ${platformName === "booking" ? "Booking.com" : "Airbnb"} calendars${failCount > 0 ? `, ${failCount} failed` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    fetchData();
    setSyncing(null);
  };

  const handleDeleteFeed = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("room_ical_feeds")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "External calendar removed",
      });

      fetchData();
    } catch (error) {
      console.error("Error deleting feed:", error);
      toast({
        title: "Error",
        description: "Failed to delete calendar",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getRoomName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? `${room.name}${room.room_number ? ` (${room.room_number})` : ""}` : "Unknown Room";
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Sync (iCal)</h2>
          <p className="text-muted-foreground">
            Sync your availability with Booking.com, Airbnb, and other platforms
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add External Calendar
        </Button>
      </div>

      {/* Export Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Export Your Calendars
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Copy these URLs and add them to Booking.com, Airbnb, or other platforms to block your availability
        </p>
        <div className="space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{room.name}</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {getICalUrl(room.id)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getICalUrl(room.id))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Import Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            External Calendars
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncByPlatform("airbnb")}
              disabled={syncing === "platform-airbnb" || !feeds.some(f => f.platform === "airbnb" && f.is_active)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing === "platform-airbnb" ? "animate-spin" : ""}`} />
              Sync Airbnb
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncByPlatform("booking")}
              disabled={syncing === "platform-booking" || !feeds.some(f => f.platform === "booking" && f.is_active)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing === "platform-booking" ? "animate-spin" : ""}`} />
              Sync Booking
            </Button>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} {room.room_number && `(${room.room_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="vrbo">VRBO</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>iCal Feed URL</Label>
              <Input
                placeholder="https://www.airbnb.com/calendar/ical/123456.ics?s=..."
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the complete iCal URL ending in .ics from Airbnb, Booking.com, or other platforms
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddFeed}>Add Calendar</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No external calendars added yet
          </p>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed) => (
              <div key={feed.id} className="flex items-center gap-3 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{getRoomName(feed.room_id)}</p>
                    <Badge variant="outline">{feed.platform}</Badge>
                    <Badge variant={feed.sync_status === "success" ? "default" : "destructive"}>
                      {feed.sync_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground break-all">{feed.feed_url}</p>
                  {feed.last_synced_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last synced: {new Date(feed.last_synced_at).toLocaleString()}
                    </p>
                  )}
                  {feed.sync_error && (
                    <p className="text-xs text-destructive mt-1">{feed.sync_error}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncFeed(feed)}
                  disabled={syncing === feed.id}
                >
                  <RefreshCw className={`h-4 w-4 ${syncing === feed.id ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(feed.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete external calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the calendar sync. Bookings created from this calendar will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFeed}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
