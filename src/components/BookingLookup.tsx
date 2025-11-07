import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Calendar, MapPin, Users, CreditCard, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { QRCodeCanvas } from "qrcode.react";

interface BookingLookupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingLookup({ open, onOpenChange }: BookingLookupProps) {
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  const handleLookup = async () => {
    if (!confirmationNumber.trim()) {
      toast.error("Please enter a confirmation number");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          rooms (
            name,
            room_number
          ),
          hotels (
            name,
            email,
            phone,
            address,
            city,
            country
          )
        `)
        .eq('confirmation_number', confirmationNumber.trim().toUpperCase())
        .single();

      if (error || !data) {
        toast.error("No booking found with this confirmation number");
        setBooking(null);
        return;
      }

      setBooking(data);
    } catch (error) {
      console.error("Error looking up booking:", error);
      toast.error("Failed to lookup booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmationNumber("");
    setBooking(null);
    onOpenChange(false);
  };

  const handleDownloadPDF = () => {
    if (!booking) return;

    // Generate QR code
    const bookingUrl = `${window.location.origin}/booking/${booking.confirmation_number}`;
    const qrCanvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    const qrDataUrl = qrCanvas?.toDataURL('image/png');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Booking Confirmation", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 15;
    doc.setDrawColor(128, 90, 213);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    
    yPosition += 15;

    // Confirmation Number
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Confirmation Number:", 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(booking.confirmation_number, 80, yPosition);
    
    yPosition += 10;

    // Status
    doc.setFont("helvetica", "bold");
    doc.text("Status:", 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(booking.status.replace(/_/g, ' ').toUpperCase(), 80, yPosition);
    
    yPosition += 15;

    // Hotel Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Hotel Information", 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${booking.hotels.name}`, 20, yPosition);
    yPosition += 8;
    
    const address = [booking.hotels.address, booking.hotels.city, booking.hotels.country].filter(Boolean).join(', ');
    doc.text(`Location: ${address}`, 20, yPosition);
    yPosition += 8;
    
    if (booking.hotels.phone) {
      doc.text(`Phone: ${booking.hotels.phone}`, 20, yPosition);
      yPosition += 8;
    }
    
    if (booking.hotels.email) {
      doc.text(`Email: ${booking.hotels.email}`, 20, yPosition);
      yPosition += 8;
    }
    
    yPosition += 10;

    // Stay Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Stay Information", 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Check-in: ${format(new Date(booking.check_in), 'MMMM dd, yyyy')}`, 20, yPosition);
    yPosition += 8;
    
    doc.text(`Check-out: ${format(new Date(booking.check_out), 'MMMM dd, yyyy')}`, 20, yPosition);
    yPosition += 8;
    
    doc.text(`Room: ${booking.rooms.name}${booking.rooms.room_number ? ` (${booking.rooms.room_number})` : ''}`, 20, yPosition);
    yPosition += 15;

    // Guest Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Guest Information", 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${booking.full_name}`, 20, yPosition);
    yPosition += 8;
    
    doc.text(`Email: ${booking.guest_email}`, 20, yPosition);
    yPosition += 8;
    
    if (booking.guest_phone) {
      doc.text(`Phone: ${booking.guest_phone}`, 20, yPosition);
      yPosition += 8;
    }
    
    doc.text(`Number of Guests: ${booking.guest_count}`, 20, yPosition);
    yPosition += 15;

    // Payment Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Information", 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Amount: €${booking.total_amount}`, 20, yPosition);
    yPosition += 8;
    
    doc.text(`Payment Status: ${booking.payment_status.replace(/_/g, ' ').toUpperCase()}`, 20, yPosition);
    
    if (booking.notes) {
      yPosition += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Notes", 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(booking.notes, pageWidth - 40);
      doc.text(splitNotes, 20, yPosition);
    }

    // Add QR Code if available
    if (qrDataUrl) {
      yPosition += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Scan QR Code to View Booking", 20, yPosition);
      yPosition += 10;
      
      // Add QR code image centered
      const qrSize = 50;
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
    }

    // Footer
    yPosition = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: "center" });

    // Save PDF
    doc.save(`booking-${booking.confirmation_number}.pdf`);
    toast.success("Booking details downloaded successfully");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Find Your Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Enter your confirmation number to view your booking details.
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmation Number</Label>
              <div className="flex gap-2">
                <Input
                  id="confirmation"
                  type="text"
                  placeholder="WIXOXXXXXXXXX"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  className="font-mono"
                />
                <Button
                  onClick={handleLookup}
                  disabled={loading || !confirmationNumber}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {booking && (
            <div className="space-y-4 border-t pt-6">
              {/* Hidden QR Code for PDF generation */}
              <div className="hidden">
                <QRCodeCanvas
                  id="qr-code-canvas"
                  value={`${window.location.origin}/booking/${booking.confirmation_number}`}
                  size={256}
                  level="H"
                />
              </div>
              <div className="bg-gradient-primary p-4 rounded-lg text-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm opacity-90">Confirmation</p>
                    <p className="text-lg font-mono font-bold">{booking.confirmation_number}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm opacity-90">Status</p>
                  <p className="text-lg font-bold capitalize">{booking.status.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">{booking.hotels.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {[booking.hotels.address, booking.hotels.city, booking.hotels.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Stay Dates</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.check_in), 'MMM dd, yyyy')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Guest Details</p>
                        <p className="text-sm text-muted-foreground">{booking.full_name}</p>
                        <p className="text-sm text-muted-foreground">{booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Total Amount</p>
                        <p className="text-lg font-bold text-primary">€{booking.total_amount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Room</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.rooms.name} {booking.rooms.room_number ? `(${booking.rooms.room_number})` : ''}
                  </p>
                </div>

                {booking.notes && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{booking.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleDownloadPDF}
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}