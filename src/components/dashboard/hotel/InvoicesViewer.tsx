import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  status: string;
  payment_date: string | null;
  notes: string | null;
  currency?: string;
}

const InvoicesViewer = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paypalLoading, setPaypalLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: hotel } = await supabase
        .from('hotels')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!hotel) return;

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('hotel_id', hotel.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const handlePayWithPayPal = async (invoice: Invoice) => {
    if (invoice.status === 'paid') {
      toast.info("This invoice is already paid");
      return;
    }

    setPaypalLoading(true);

    try {
      // Create PayPal order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-paypal-order', {
        body: { invoice_id: invoice.id }
      });

      if (orderError) throw orderError;

      if (!orderData?.order_id) {
        throw new Error("Failed to create PayPal order");
      }

      // Find the approval URL
      const approvalLink = orderData.links?.find((link: any) => link.rel === 'approve');
      
      if (approvalLink?.href) {
        // Open PayPal checkout in a new window
        const paypalWindow = window.open(approvalLink.href, '_blank', 'width=500,height=600');
        
        // Poll for payment completion
        const checkPayment = setInterval(async () => {
          if (paypalWindow?.closed) {
            clearInterval(checkPayment);
            
            // Check if payment was completed by verifying invoice status
            const { data: updatedInvoice } = await supabase
              .from('invoices')
              .select('status')
              .eq('id', invoice.id)
              .single();

            if (updatedInvoice?.status === 'paid') {
              toast.success("Payment successful! Invoice has been marked as paid.");
              fetchInvoices();
              setIsDetailOpen(false);
            } else {
              // Try to capture the order
              const { data: captureData, error: captureError } = await supabase.functions.invoke('capture-paypal-order', {
                body: { order_id: orderData.order_id, invoice_id: invoice.id }
              });

              if (captureData?.success) {
                toast.success("Payment successful! Invoice has been marked as paid.");
                fetchInvoices();
                setIsDetailOpen(false);
              } else if (!captureError) {
                toast.info("Payment window closed. If you completed the payment, it will be reflected shortly.");
                fetchInvoices();
              }
            }
            setPaypalLoading(false);
          }
        }, 1000);

        // Clear interval after 10 minutes to prevent memory leak
        setTimeout(() => {
          clearInterval(checkPayment);
          setPaypalLoading(false);
        }, 600000);
      } else {
        throw new Error("No approval URL found");
      }
    } catch (error: any) {
      console.error("PayPal payment error:", error);
      toast.error(error.message || "Failed to initiate PayPal payment");
      setPaypalLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const doc = new jsPDF();
      
      // Generate QR code for PayPal link
      const qrCodeDataUrl = await QRCode.toDataURL("https://www.paypal.me/DorjanCocka", {
        width: 80,
        margin: 1,
      });
      
      // Header with brand color
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.text("WIXOTEL", 105, 18, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Invoice", 105, 28, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      
      // Invoice number and status box
      doc.setFillColor(249, 250, 251);
      doc.rect(20, 50, 170, 25, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Invoice #${invoice.invoice_number}`, 25, 60);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 25, 68);
      
      // Invoice details - two columns
      const leftCol = 25;
      const rightCol = 110;
      let yPos = 90;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Issue Date:", leftCol, yPos);
      doc.text("Due Date:", rightCol, yPos);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      yPos += 6;
      doc.text(format(new Date(invoice.issue_date), 'MMM dd, yyyy'), leftCol, yPos);
      doc.text(format(new Date(invoice.due_date), 'MMM dd, yyyy'), rightCol, yPos);
      
      // Billing Period
      yPos += 15;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text("Billing Period:", leftCol, yPos);
      
      doc.setTextColor(0, 0, 0);
      yPos += 6;
      doc.text(`${format(new Date(invoice.billing_period_start), 'MMM dd, yyyy')} - ${format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}`, leftCol, yPos);
      
      // Amount details box
      yPos += 20;
      doc.setFillColor(249, 250, 251);
      doc.rect(20, yPos - 5, 170, 35, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Subtotal:", 25, yPos + 5);
      doc.text(`€${invoice.amount.toFixed(2)}`, 165, yPos + 5, { align: 'right' });
      
      yPos += 8;
      doc.text("Tax:", 25, yPos + 5);
      doc.text(`€${invoice.tax_amount.toFixed(2)}`, 165, yPos + 5, { align: 'right' });
      
      // Total with highlight
      yPos += 12;
      doc.setFillColor(59, 130, 246);
      doc.rect(20, yPos, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text("TOTAL:", 25, yPos + 7);
      doc.text(`€${invoice.total_amount.toFixed(2)}`, 165, yPos + 7, { align: 'right' });
      
      // Payment Details Section
      yPos += 20;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("Payment Details", 25, yPos);
      
      // Bank Transfer
      yPos += 8;
      doc.setFillColor(249, 250, 251);
      doc.rect(20, yPos - 3, 170, 32, 'F');
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Bank Transfer", 25, yPos + 2);
      
      doc.setFont(undefined, 'normal');
      yPos += 7;
      doc.text("Bank Name: Pro Credit Bank Albania", 25, yPos + 2);
      yPos += 5;
      doc.text("Account Name: DORJAN COCKA", 25, yPos + 2);
      yPos += 5;
      doc.text("IBAN: AL25209110810000081072760202", 25, yPos + 2);
      yPos += 5;
      doc.text("SWIFT: FEFAALTRXXX", 25, yPos + 2);
      
      // PayPal with QR code
      yPos += 10;
      doc.setFillColor(249, 250, 251);
      doc.rect(20, yPos - 3, 170, 28, 'F');
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("PayPal", 25, yPos + 2);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(59, 130, 246);
      yPos += 5;
      doc.text("https://www.paypal.me/DorjanCocka", 25, yPos + 2);
      
      doc.addImage(qrCodeDataUrl, 'PNG', 160, yPos - 8, 25, 25);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.text("Scan to pay", 172.5, yPos + 20, { align: 'center' });
      
      yPos += 5;
      
      if (invoice.notes) {
        yPos += 12;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text("Notes:", 25, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        yPos += 5;
        doc.text(invoice.notes, 25, yPos, { maxWidth: 160 });
      }
      
      doc.setFillColor(249, 250, 251);
      doc.rect(0, 270, 210, 27, 'F');
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text("For any questions or support, please contact us at:", 105, 280, { align: "center" });
      
      doc.setTextColor(59, 130, 246);
      doc.setFont(undefined, 'bold');
      doc.text("support@wixotel.com", 105, 286, { align: "center" });
      
      doc.save(`invoice-${invoice.invoice_number}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to download invoice");
    }
  };

  if (loading) {
    return <div>Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Invoices</h2>
        <p className="text-muted-foreground">View and manage your invoices</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(invoice.billing_period_start), 'MMM dd')} - {format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>€{invoice.amount}</TableCell>
                    <TableCell className="font-semibold">€{invoice.total_amount}</TableCell>
                    <TableCell>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {invoice.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handlePayWithPayPal(invoice)}
                          disabled={paypalLoading}
                          className="gap-1"
                        >
                          {paypalLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          Pay
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleViewDetails(invoice)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Invoice Details</DialogTitle>
              {selectedInvoice && (
                <Button 
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-semibold">{format(new Date(selectedInvoice.issue_date), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Billing Period</h3>
                <p className="text-sm">
                  {format(new Date(selectedInvoice.billing_period_start), 'MMMM dd, yyyy')} - {format(new Date(selectedInvoice.billing_period_end), 'MMMM dd, yyyy')}
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Amount Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>€{selectedInvoice.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>€{selectedInvoice.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>€{selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-semibold">{format(new Date(selectedInvoice.due_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(selectedInvoice.status)} className="text-lg px-4 py-1">
                    {selectedInvoice.status}
                  </Badge>
                </div>
                {selectedInvoice.payment_date && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Payment Date</p>
                    <p className="font-semibold">{format(new Date(selectedInvoice.payment_date), 'MMM dd, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Pay Now Button for unpaid invoices */}
              {selectedInvoice.status !== 'paid' && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() => handlePayWithPayPal(selectedInvoice)}
                    disabled={paypalLoading}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {paypalLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Pay Now with PayPal / Credit Card
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Secure payment powered by PayPal. Pay with credit/debit card or PayPal balance.
                  </p>
                </div>
              )}

              {/* Payment Details Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Alternative Payment Methods</h3>
                <div className="space-y-6">
                  {/* Bank Transfer */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-sm">Bank Transfer</p>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="font-medium">Pro Credit Bank Albania</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium">DORJAN COCKA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IBAN:</span>
                        <span className="font-mono text-xs">AL25209110810000081072760202</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SWIFT:</span>
                        <span className="font-medium">FEFAALTRXXX</span>
                      </div>
                    </div>
                  </div>

                  {/* PayPal Manual Section */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="font-medium text-sm mb-3">PayPal Manual Payment</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1">
                        <a 
                          href="https://www.paypal.me/DorjanCocka" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          paypal.me/DorjanCocka
                        </a>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white p-2 rounded-lg border">
                          <QRCodeSVG 
                            value="https://www.paypal.me/DorjanCocka" 
                            size={100}
                            level="M"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Scan to pay</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesViewer;
