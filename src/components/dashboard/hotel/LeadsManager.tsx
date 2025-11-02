import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, Calendar, Users, MessageSquare, Loader2, Trash2 } from "lucide-react";
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

  useEffect(() => {
    fetchLeads();
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
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false });

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
        .update({ status: newStatus })
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

      // Then create booking from lead
      const { error: bookingError } = await supabase.from("bookings").insert({
        hotel_id: hotelId,
        room_id: lead.room_id,
        guest_id: guestData.id,
        full_name: lead.full_name,
        guest_email: lead.email,
        guest_phone: lead.phone,
        check_in: lead.check_in,
        check_out: lead.check_out,
        guest_count: lead.guests,
        total_amount: 0,
        status: "pending",
        payment_status: "pending",
        notes: lead.message || "Created from booking request",
      });

      if (bookingError) throw bookingError;

      // Send approval email to guest via Edge Function
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            hotel_id: hotelId,
            recipient_email: lead.email,
            subject: 'Booking Request Approved',
            email_type: 'lead_approved',
            html_content: `
              <h2>Booking Request Approved ✓</h2>
              <p>Dear ${lead.full_name},</p>
              <p>Your booking request has been approved.</p>
              <ul>
                <li><strong>Check-in:</strong> ${lead.check_in}</li>
                <li><strong>Check-out:</strong> ${lead.check_out}</li>
                <li><strong>Guests:</strong> ${lead.guests}</li>
              </ul>
              <p>We look forward to welcoming you!</p>
            `,
          },
        });
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
      }

      // Update lead status to converted
      await updateLeadStatus(lead.id, "converted");
      
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
        await supabase.functions.invoke('send-email', {
          body: {
            hotel_id: hotelId,
            recipient_email: lead.email,
            subject: 'Booking Request Update',
            email_type: 'lead_rejected',
            html_content: `
              <h2>Booking Request Update</h2>
              <p>Dear ${lead.full_name},</p>
              <p>Unfortunately, we are unable to accommodate your booking request for the selected dates.</p>
              <ul>
                <li><strong>Check-in:</strong> ${lead.check_in}</li>
                <li><strong>Check-out:</strong> ${lead.check_out}</li>
              </ul>
              <p>Please try different dates or contact us for alternatives.</p>
            `,
          },
        });
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

  const deleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;
      toast.success("Lead deleted");
      fetchLeads();
      setSelectedLead(null);
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
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
            Manage inquiries from potential guests ({leads.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No leads yet. They will appear here when visitors submit the contact form.
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

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Submitted on {format(new Date(selectedLead.created_at), "MMMM dd, yyyy 'at' HH:mm")}
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteLead(selectedLead.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Lead
                  </Button>
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
