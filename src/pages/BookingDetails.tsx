import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Users, CreditCard, ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import logoImage from "@/assets/wixotel-logo.png";

export default function BookingDetails() {
  const { confirmationNumber } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    let yPosition = 12;

    const logo = new Image();
    logo.src = logoImage;
    logo.onload = () => {
      const logoWidth = 35;
      const logoHeight = 13;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logo, 'PNG', logoX, yPosition, logoWidth, logoHeight);
      
      yPosition += logoHeight + 6;

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 58, 135);
      doc.text("Booking Confirmation", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 4;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Your reservation details", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 7;
      doc.setDrawColor(128, 90, 213);
      doc.setLineWidth(0.8);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      doc.setDrawColor(160, 120, 220);
      doc.setLineWidth(0.2);
      doc.line(20, yPosition + 0.5, pageWidth - 20, yPosition + 0.5);
      
      yPosition += 10;

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
      
      yPosition += 14;

      doc.setFillColor(128, 90, 213);
      doc.rect(15, yPosition, 3, 6, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 58, 135);
      doc.text("Hotel Information", 20, yPosition + 4);
      yPosition += 9;
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.text(booking.hotels.name, 20, yPosition);
      yPosition += 5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const address = [booking.hotels.address, booking.hotels.city, booking.hotels.country].filter(Boolean).join(', ');
      const addressLines = doc.splitTextToSize(address, pageWidth - 40);
      doc.text(addressLines, 20, yPosition);
      yPosition += addressLines.length * 5;
      
      if (booking.hotels.phone) {
        doc.text(`Phone: ${booking.hotels.phone}`, 20, yPosition);
        yPosition += 4.5;
      }
      
      if (booking.hotels.email) {
        doc.text(`Email: ${booking.hotels.email}`, 20, yPosition);
        yPosition += 4.5;
      }
      
      yPosition += 7;

      doc.setFillColor(128, 90, 213);
      doc.rect(15, yPosition, 3, 6, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 58, 135);
      doc.text("Stay Information", 20, yPosition + 4);
      yPosition += 9;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Check-in: ${format(new Date(booking.check_in), 'MMM dd, yyyy')}`, 20, yPosition);
      yPosition += 5;
      
      doc.text(`Check-out: ${format(new Date(booking.check_out), 'MMM dd, yyyy')}`, 20, yPosition);
      yPosition += 5;
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(`Room: ${booking.rooms.name}${booking.rooms.room_number ? ` (${booking.rooms.room_number})` : ''}`, 20, yPosition);
      yPosition += 9;

      doc.setFillColor(128, 90, 213);
      doc.rect(15, yPosition, 3, 6, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 58, 135);
      doc.text("Guest Information", 20, yPosition + 4);
      yPosition += 9;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Name: ${booking.full_name}`, 20, yPosition);
      yPosition += 5;
      
      doc.text(`Email: ${booking.guest_email}`, 20, yPosition);
      yPosition += 5;
      
      if (booking.guest_phone) {
        doc.text(`Phone: ${booking.guest_phone}`, 20, yPosition);
        yPosition += 5;
      }
      
      doc.text(`Number of Guests: ${booking.guest_count}`, 20, yPosition);
      yPosition += 9;

      doc.setFillColor(128, 90, 213);
      doc.rect(15, yPosition, 3, 6, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 58, 135);
      doc.text("Payment Information", 20, yPosition + 4);
      yPosition += 9;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(128, 90, 213);
      doc.text(`Total Amount: €${booking.total_amount}`, 20, yPosition);
      yPosition += 6;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Payment Status: ${booking.payment_status.replace(/_/g, ' ').toUpperCase()}`, 20, yPosition);
      
      if (booking.notes) {
        yPosition += 8;
        doc.setFillColor(128, 90, 213);
        doc.rect(15, yPosition, 3, 6, 'F');
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(74, 58, 135);
        doc.text("Notes", 20, yPosition + 4);
        yPosition += 9;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const splitNotes = doc.splitTextToSize(booking.notes, pageWidth - 40);
        doc.text(splitNotes, 20, yPosition);
        yPosition += splitNotes.length * 4.5;
      }

      if (qrDataUrl) {
        yPosition += 8;
        
        doc.setFillColor(250, 250, 250);
        const qrBoxHeight = 50;
        doc.roundedRect(15, yPosition, pageWidth - 30, qrBoxHeight, 3, 3, 'FD');
        
        yPosition += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(74, 58, 135);
        doc.text("Scan QR Code to View Booking Online", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;
        
        const qrSize = 35;
        const qrX = (pageWidth - qrSize) / 2;
        doc.addImage(qrDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
      }

      const footerY = pageHeight - 20;
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, footerY, pageWidth - 20, footerY);
      
      doc.setFontSize(8);
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
    
    logo.onerror = () => {
      toast.error("Failed to load logo");
    };
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

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleDownloadPDF}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
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
    </div>
  );
}
