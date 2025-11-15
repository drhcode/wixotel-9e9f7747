import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Calendar, Users, MessageSquare, Loader2, ChevronLeft, ChevronRight, Search, Monitor, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  message: string | null;
  status: string;
  created_at: string;
  room_id: string | null;
  is_read?: boolean;
  total_amount?: number;
  ip_address?: string | null;
  device_type?: string | null;
  browser?: string | null;
  user_agent?: string | null;
}

interface Room {
  id: string;
  name: string;
  room_number: string | null;
}

interface LeadsManagerProps {
  hotelId: string;
}

const LeadsManager = ({ hotelId }: LeadsManagerProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [acceptingLead, setAcceptingLead] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchLeads();
  }, [hotelId, currentPage, searchQuery]);

  useEffect(() => {
    fetchRooms();
    
    // Subscribe to new leads
    const channel = supabase
      .channel('new-leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `hotel_id=eq.${hotelId}`,
        },
        async (payload) => {
          const newLead = payload.new as Lead;
          
          // Create notification for new lead
          await supabase.from('notifications').insert({
            hotel_id: hotelId,
            type: 'new_lead',
            title: 'New Lead',
            message: `New booking inquiry from ${newLead.full_name}`,
          });
          
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, room_number")
        .eq("hotel_id", hotelId);

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      // Build query with search
      let countQuery = supabase
        .from("leads")
        .select("*", { count: 'exact', head: true })
        .eq("hotel_id", hotelId);

      let dataQuery = supabase
        .from("leads")
        .select("*")
        .eq("hotel_id", hotelId);

      // Apply search filter if query exists
      if (searchQuery.trim()) {
        const search = `%${searchQuery.trim()}%`;
        countQuery = countQuery.or(`full_name.ilike.${search},email.ilike.${search},phone.ilike.${search}`);
        dataQuery = dataQuery.or(`full_name.ilike.${search},email.ilike.${search},phone.ilike.${search}`);
      }

      // Get total count with search
      const { count } = await countQuery;
      
      const total = count || 0;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));

      // Reset to page 1 if current page exceeds total pages
      if (currentPage > Math.ceil(total / ITEMS_PER_PAGE) && total > 0) {
        setCurrentPage(1);
        return;
      }

      // Get paginated data
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await dataQuery
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const markLeadAsRead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ is_read: true })
        .eq("id", leadId);

      if (error) throw error;
      
      // Update local state
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, is_read: true } : lead
      ));
    } catch (error: any) {
      console.error("Error marking lead as read:", error);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, is_read: true })
        .eq("id", leadId);

      if (error) throw error;
      toast.success("Lead status updated");
      fetchLeads();
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast.error("Failed to update lead status");
    }
  };

  const acceptBookingRequest = async (lead: Lead) => {
    if (!lead.room_id) {
      toast.error("This lead doesn't have a room associated");
      return;
    }

    try {
      setAcceptingLead(true);

      // Get room data to calculate total cost
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("price, name")
        .eq("id", lead.room_id)
        .single();

      if (roomError) throw roomError;

      // Calculate number of nights and total cost
      const checkInDate = new Date(lead.check_in);
      const checkOutDate = new Date(lead.check_out);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = nights * Number(roomData.price);

      // First, create a guest entry
      const { data: guestData, error: guestError } = await supabase
        .from("guests")
        .insert({
          hotel_id: hotelId,
          name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
        })
        .select()
        .single();

      if (guestError) throw guestError;

      // Generate unique confirmation number
      const confirmationNumber = `WIXO${Date.now()}${Math.random().toString(36).substring(2, 9)}`.toUpperCase();

      // Then create booking from lead with calculated total
      const { data: bookingData, error: bookingError } = await supabase.from("bookings").insert({
        hotel_id: hotelId,
        room_id: lead.room_id,
        guest_id: guestData.id,
        full_name: lead.full_name,
        guest_email: lead.email,
        guest_phone: lead.phone,
        check_in: lead.check_in,
        check_out: lead.check_out,
        guest_count: lead.guests,
        total_amount: totalAmount,
        status: "reserved",
        payment_status: "pending",
        confirmation_number: confirmationNumber,
        notes: lead.message || "Created from booking request",
        source: "lead", // Mark as coming from lead
        lead_id: lead.id, // Link booking to the originating lead
      }).select().single();

      if (bookingError) throw bookingError;

      // Note: Earnings will be automatically created when booking is checked out

      // Send approval email to guest via Edge Function
      try {
        const { data: hotelData } = await supabase
          .from('hotels')
          .select('name, email, phone, address, city, country')
          .eq('id', hotelId)
          .single();

        if (hotelData) {
          const { createBookingConfirmationEmail } = await import('@/lib/emailTemplates');
          const htmlContent = createBookingConfirmationEmail({
            guestName: lead.full_name,
            roomName: roomData.name,
            checkIn: format(new Date(lead.check_in), 'PPP'),
            checkOut: format(new Date(lead.check_out), 'PPP'),
            totalAmount: totalAmount,
            confirmationNumber: confirmationNumber,
            hotel: hotelData,
          });

          await supabase.functions.invoke('send-email', {
            body: {
              hotel_id: hotelId,
              recipient_email: lead.email,
              subject: `Booking Confirmation - ${hotelData.name}`,
              email_type: 'booking_confirmation',
              html_content: htmlContent,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
      }

      // Update lead status to converted and broadcast update
      await updateLeadStatus(lead.id, "converted");

      // Notify sidebar to refresh leads count immediately
      const channel = supabase.channel(`hotel-${hotelId}`);
      await channel.subscribe();
      await channel.send({ type: 'broadcast', event: 'leads_updated', payload: { hotelId } });
      await supabase.removeChannel(channel);
      
      // Create notifications
      await supabase.from('notifications').insert([
        {
          hotel_id: hotelId,
          type: 'booking_created',
          title: 'New Reservation',
          message: `New reservation created for ${lead.full_name}`,
        },
        {
          hotel_id: hotelId,
          type: 'lead_converted',
          title: 'Lead Converted',
          message: `Booking request from ${lead.full_name} accepted and converted to reservation`,
        }
      ]);
      
      toast.success("Booking request accepted! Reservation created and guest notified.");
      setSelectedLead(null);
    } catch (error: any) {
      console.error("Error accepting booking request:", error);
      toast.error("Failed to accept booking request");
    } finally {
      setAcceptingLead(false);
    }
  };

  const rejectBookingRequest = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    
    if (lead) {
      // Send rejection email to guest via Edge Function
      try {
        const { data: hotelData } = await supabase
          .from('hotels')
          .select('name, email, phone, address, city, country')
          .eq('id', hotelId)
          .single();

        if (hotelData) {
          const { createLeadRejectedEmail } = await import('@/lib/emailTemplates');
          const htmlContent = createLeadRejectedEmail({
            guestName: lead.full_name,
            checkIn: format(new Date(lead.check_in), 'PPP'),
            checkOut: format(new Date(lead.check_out), 'PPP'),
            hotel: hotelData,
          });

          await supabase.functions.invoke('send-email', {
            body: {
              hotel_id: hotelId,
              recipient_email: lead.email,
              subject: `Booking Request Update - ${hotelData.name}`,
              email_type: 'lead_rejected',
              html_content: htmlContent,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }

      // Create notification
      await supabase.from('notifications').insert({
        hotel_id: hotelId,
        type: 'lead_rejected',
        title: 'Booking Request Rejected',
        message: `Booking request from ${lead.full_name} has been rejected`,
      });
    }
    
    await updateLeadStatus(leadId, "lost");
    toast.success("Booking request rejected and guest notified");
    setSelectedLead(null);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500/10 text-blue-500";
      case "contacted":
        return "bg-yellow-500/10 text-yellow-500";
      case "converted":
        return "bg-green-500/10 text-green-500";
      case "lost":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leads Management</CardTitle>
          <CardDescription>
            Manage inquiries from potential guests ({totalCount} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-10"
              />
            </div>
          </div>

          {leads.length === 0 && !searchQuery ? (
            <div className="text-center py-12 text-muted-foreground">
              No leads yet. They will appear here when visitors submit the contact form.
            </div>
          ) : leads.length === 0 && searchQuery ? (
            <div className="text-center py-12 text-muted-foreground">
              No leads found matching "{searchQuery}". Try a different search term.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stay Dates</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-accent/50" 
                      onClick={() => {
                        setSelectedLead(lead);
                        if (!lead.is_read) {
                          markLeadAsRead(lead.id);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {!lead.is_read && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full" title="Unread" />
                          )}
                          {lead.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(lead.check_in), "MMM dd")} - {format(new Date(lead.check_out), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{lead.guests}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs">
                          {lead.device_type && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Monitor className="h-3 w-3" />
                              <span className="capitalize">{lead.device_type}</span>
                            </div>
                          )}
                          {lead.browser && (
                            <span className="text-muted-foreground">{lead.browser}</span>
                          )}
                          {!lead.device_type && !lead.browser && (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.total_amount ? `€${lead.total_amount.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle>Lead Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Full Name</div>
                        <div className="font-medium">{selectedLead.full_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <a href={`mailto:${selectedLead.email}`} className="font-medium text-primary hover:underline">
                          {selectedLead.email}
                        </a>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                        <a href={`tel:${selectedLead.phone}`} className="font-medium text-primary hover:underline">
                          {selectedLead.phone}
                        </a>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Stay Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Check-in</div>
                        <div className="font-medium">{format(new Date(selectedLead.check_in), "MMMM dd, yyyy")}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Check-out</div>
                        <div className="font-medium">{format(new Date(selectedLead.check_out), "MMMM dd, yyyy")}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Guests</div>
                        <div className="font-medium flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {selectedLead.guests}
                        </div>
                      </div>
                      {selectedLead.total_amount && (
                        <div>
                          <div className="text-sm text-muted-foreground">Total Amount</div>
                          <div className="font-medium text-lg text-primary">
                            €{selectedLead.total_amount.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {selectedLead.room_id && (
                        <div>
                          <div className="text-sm text-muted-foreground">Requested Room</div>
                          <div className="font-medium">
                            {rooms.find(r => r.id === selectedLead.room_id)?.name || "Unknown Room"}
                            {rooms.find(r => r.id === selectedLead.room_id)?.room_number && 
                              ` (${rooms.find(r => r.id === selectedLead.room_id)?.room_number})`
                            }
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {selectedLead.message && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{selectedLead.message}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Security & Device Information */}
                {(selectedLead.ip_address || selectedLead.device_type || selectedLead.browser) && (
                  <Card className="border-muted">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security & Device Information
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Collected for fraud prevention (90-day retention)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedLead.ip_address && (
                        <div>
                          <div className="text-sm text-muted-foreground">IP Address</div>
                          <div className="font-mono text-sm">{selectedLead.ip_address}</div>
                        </div>
                      )}
                      {selectedLead.device_type && (
                        <div>
                          <div className="text-sm text-muted-foreground">Device Type</div>
                          <div className="font-medium capitalize">{selectedLead.device_type}</div>
                        </div>
                      )}
                      {selectedLead.browser && (
                        <div>
                          <div className="text-sm text-muted-foreground">Browser</div>
                          <div className="font-medium">{selectedLead.browser}</div>
                        </div>
                      )}
                      {selectedLead.user_agent && (
                        <div>
                          <div className="text-sm text-muted-foreground">User Agent</div>
                          <div className="font-mono text-xs text-muted-foreground break-all">
                            {selectedLead.user_agent}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedLead.room_id && selectedLead.status === "new" && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">Booking Request Actions</h4>
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => acceptBookingRequest(selectedLead)}
                          disabled={acceptingLead}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {acceptingLead ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              ✓ Accept & Create Booking
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => rejectBookingRequest(selectedLead.id)}
                          variant="destructive"
                          className="flex-1"
                        >
                          ✗ Reject Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-end pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Submitted on {format(new Date(selectedLead.created_at), "MMMM dd, yyyy 'at' HH:mm")}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsManager;
