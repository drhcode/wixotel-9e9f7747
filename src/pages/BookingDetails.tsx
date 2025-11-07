import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Users, CreditCard, ArrowLeft, Download, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
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

export default function BookingDetails() {
  const { confirmationNumber } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!confirmationNumber) {
        navigate("/");
        return;
      }

      try {
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
              country,
              logo_url
            )
          `)
          .eq('confirmation_number', confirmationNumber.toUpperCase())
          .single();

        if (error || !data) {
          toast.error("Booking not found");
          navigate("/");
          return;
        }

        setBooking(data);
      } catch (error) {
        console.error("Error fetching booking:", error);
        toast.error("Failed to load booking details");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [confirmationNumber, navigate]);

  const handleDownloadPDF = () => {
    if (!booking) return;

    const qrCanvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    const qrDataUrl = qrCanvas?.toDataURL('image/png');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(128, 90, 213);
    doc.text("WIXOTEL", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 8;
    doc.setFontSize(18);
    doc.setTextColor(74, 58, 135);
    doc.text("Booking Confirmation", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Your reservation details", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 8;
    doc.setDrawColor(128, 90, 213);
    doc.setLineWidth(1);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    
    yPosition += 10;

    // Confirmation box
    doc.setFillColor(240, 237, 255);
    doc.roundedRect(15, yPosition - 4, pageWidth - 30, 20, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Confirmation Number:", 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 90, 213);
    doc.text(booking.confirmation_number, 75, yPosition);
    
    yPosition += 8;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Status:", 20, yPosition);
    doc.setFont("helvetica", "normal");
    const statusText = booking.status.replace(/_/g, ' ').toUpperCase();
    doc.setTextColor(34, 197, 94);
    doc.text(statusText, 75, yPosition);
    
    yPosition += 16;

    // Two column layout
    const leftColumnX = 20;
    const rightColumnX = pageWidth / 2 + 5;
    const columnWidth = pageWidth / 2 - 25;
    
    // Row 1: Hotel Information & Stay Information
    let leftY = yPosition;
    let rightY = yPosition;

    // Left: Hotel Information
    doc.setFillColor(128, 90, 213);
    doc.rect(leftColumnX, leftY, 3, 6, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(74, 58, 135);
    doc.text("Hotel Information", leftColumnX + 5, leftY + 4);
    leftY += 9;
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.text(booking.hotels.name, leftColumnX, leftY);
    leftY += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const address = [booking.hotels.address, booking.hotels.city, booking.hotels.country].filter(Boolean).join(', ');
    const addressLines = doc.splitTextToSize(address, columnWidth);
    doc.text(addressLines, leftColumnX, leftY);
    leftY += addressLines.length * 4;
    
    if (booking.hotels.phone) {
      doc.text(`Phone: ${booking.hotels.phone}`, leftColumnX, leftY);
      leftY += 4;
    }
    
    if (booking.hotels.email) {
      doc.text(`Email: ${booking.hotels.email}`, leftColumnX, leftY);
      leftY += 4;
    }

    // Right: Stay Information
    doc.setFillColor(128, 90, 213);
    doc.rect(rightColumnX, rightY, 3, 6, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(74, 58, 135);
    doc.text("Stay Information", rightColumnX + 5, rightY + 4);
    rightY += 9;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Check-in:`, rightColumnX, rightY);
    doc.setFont("helvetica", "bold");
    doc.text(format(new Date(booking.check_in), 'MMM dd, yyyy'), rightColumnX + 20, rightY);
    rightY += 5;
    
    doc.setFont("helvetica", "normal");
    doc.text(`Check-out:`, rightColumnX, rightY);
    doc.setFont("helvetica", "bold");
    doc.text(format(new Date(booking.check_out), 'MMM dd, yyyy'), rightColumnX + 20, rightY);
    rightY += 5;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const roomText = `Room: ${booking.rooms.name}${booking.rooms.room_number ? ` (${booking.rooms.room_number})` : ''}`;
    const roomLines = doc.splitTextToSize(roomText, columnWidth);
    doc.text(roomLines, rightColumnX, rightY);
    rightY += roomLines.length * 4;
    
    // Move to next row
    yPosition = Math.max(leftY, rightY) + 12;
    leftY = yPosition;
    rightY = yPosition;

    // Row 2 Left: Guest Information
    doc.setFillColor(128, 90, 213);
    doc.rect(leftColumnX, leftY, 3, 6, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(74, 58, 135);
    doc.text("Guest Information", leftColumnX + 5, leftY + 4);
    leftY += 9;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Name: ${booking.full_name}`, leftColumnX, leftY);
    leftY += 4.5;
    
    const guestEmail = doc.splitTextToSize(`Email: ${booking.guest_email}`, columnWidth);
    doc.text(guestEmail, leftColumnX, leftY);
    leftY += guestEmail.length * 4;
    
    if (booking.guest_phone) {
      doc.text(`Phone: ${booking.guest_phone}`, leftColumnX, leftY);
      leftY += 4.5;
    }
    
    doc.text(`Guests: ${booking.guest_count}`, leftColumnX, leftY);
    leftY += 4.5;

    // Row 2 Right: Payment Information
    doc.setFillColor(128, 90, 213);
    doc.rect(rightColumnX, rightY, 3, 6, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(74, 58, 135);
    doc.text("Payment Information", rightColumnX + 5, rightY + 4);
    rightY += 9;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(128, 90, 213);
    doc.text(`€${booking.total_amount}`, rightColumnX, rightY);
    rightY += 6;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Status: ${booking.payment_status.replace(/_/g, ' ').toUpperCase()}`, rightColumnX, rightY);
    rightY += 5;
    
    // Move to notes section
    yPosition = Math.max(leftY, rightY) + 10;
      
    // Notes section (full width)
    if (booking.notes) {
      doc.setFillColor(128, 90, 213);
      doc.rect(leftColumnX, yPosition, 3, 6, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 58, 135);
      doc.text("Notes", leftColumnX + 5, yPosition + 4);
      yPosition += 9;
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const splitNotes = doc.splitTextToSize(booking.notes, pageWidth - 40);
      doc.text(splitNotes, leftColumnX, yPosition);
      yPosition += splitNotes.length * 4 + 5;
    }

    // QR Code section (centered)
    if (qrDataUrl) {
      yPosition += 5;
      
      doc.setFillColor(250, 250, 250);
      const qrBoxHeight = 55;
      doc.roundedRect(15, yPosition, pageWidth - 30, qrBoxHeight, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, yPosition, pageWidth - 30, qrBoxHeight, 3, 3, 'S');
      
      yPosition += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 58, 135);
      doc.text("Scan QR Code to View Booking", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 7;
      
      const qrSize = 38;
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
    }

    // Footer
    const footerY = pageHeight - 20;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, footerY, pageWidth - 20, footerY);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, footerY + 5, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(128, 90, 213);
    doc.text("Need Help? Contact us at support@wixotel.com", pageWidth / 2, footerY + 10, { align: "center" });
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Wixotel - Hotel Management Platform", pageWidth / 2, footerY + 14, { align: "center" });

    doc.save(`booking-${booking.confirmation_number}.pdf`);
    toast.success("Booking details downloaded successfully");
  };

  const canCancelForFree = () => {
    if (!booking) return false;
    const daysUntilCheckIn = differenceInDays(new Date(booking.check_in), new Date());
    return daysUntilCheckIn >= 14;
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .insert({
          booking_id: booking.id,
          hotel_id: booking.hotel_id,
          requested_by: booking.guest_id,
          status: canCancelForFree() ? 'approved' : 'pending',
          reason: canCancelForFree() 
            ? 'Free cancellation within 14-day policy window' 
            : 'Cancellation request outside free cancellation window'
        });

      if (error) throw error;

      // If approved immediately, update booking status
      if (canCancelForFree()) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', booking.id);

        if (updateError) throw updateError;
      }

      toast.success(
        canCancelForFree()
          ? "Booking cancelled successfully. No charges applied."
          : "Cancellation request submitted. The hotel will review your request."
      );
      
      setShowCancelDialog(false);
      
      // Refresh booking data
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          rooms (name, room_number),
          hotels (name, email, phone, address, city, country, logo_url)
        `)
        .eq('confirmation_number', confirmationNumber!.toUpperCase())
        .single();
      
      if (data) setBooking(data);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-pulse text-muted-foreground">Loading booking details...</div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Booking Confirmation</h1>
            <p className="text-muted-foreground">Your booking has been confirmed</p>
          </div>

          {/* Hidden QR Code for PDF generation */}
          <div className="hidden">
            <QRCodeCanvas
              id="qr-code-canvas"
              value={`${window.location.origin}/booking/${booking.confirmation_number}`}
              size={256}
              level="H"
            />
          </div>

          <div className="bg-gradient-primary p-6 rounded-lg text-white space-y-3">
            <div>
              <p className="text-sm opacity-90">Confirmation Number</p>
              <p className="text-2xl font-mono font-bold">{booking.confirmation_number}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Status</p>
              <p className="text-lg font-bold capitalize">{booking.status.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div className="flex justify-center py-4">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <QRCodeCanvas
                value={`${window.location.origin}/booking/${booking.confirmation_number}`}
                size={200}
                level="H"
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                Scan to view booking
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-xl">{booking.hotels.name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
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

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Stay Dates</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.check_in), 'MMM dd, yyyy')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Guest Details</p>
                    <p className="text-sm text-muted-foreground">{booking.full_name}</p>
                    <p className="text-sm text-muted-foreground">{booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Total Amount</p>
                    <p className="text-2xl font-bold text-primary">€{booking.total_amount}</p>
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

          {booking.status !== 'cancelled' && (
            <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-3 rounded-md border border-border/50 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div>
                <p className="font-medium mb-1">Cancellation Policy</p>
                <p>
                  Free cancellation up to 14 days before check-in. 
                  {canCancelForFree() 
                    ? " You can cancel this booking for free." 
                    : " Cancellations within 14 days of check-in require hotel approval."}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleDownloadPDF}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {booking.status !== 'cancelled' && (
              <Button 
                variant="destructive" 
                onClick={() => setShowCancelDialog(true)}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex-1"
            >
              Go to Home
            </Button>
          </div>
        </Card>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {canCancelForFree() ? (
                <>
                  This booking is eligible for free cancellation as it's more than 14 days before check-in.
                  Your booking will be cancelled immediately with no charges.
                </>
              ) : (
                <>
                  This cancellation request is within 14 days of check-in and will require hotel approval.
                  The hotel will review your request and contact you.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
