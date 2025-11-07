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
    let yPosition = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Booking Confirmation", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 15;
    doc.setDrawColor(128, 90, 213);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Confirmation Number:", 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(booking.confirmation_number, 80, yPosition);
    
    yPosition += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Status:", 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(booking.status.replace(/_/g, ' ').toUpperCase(), 80, yPosition);
    
    yPosition += 15;

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

    if (qrDataUrl) {
      yPosition += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Scan QR Code to View Booking", 20, yPosition);
      yPosition += 10;
      
      const qrSize = 50;
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
    }

    yPosition = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: "center" });

    doc.save(`booking-${booking.confirmation_number}.pdf`);
    toast.success("Booking details downloaded successfully");
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
