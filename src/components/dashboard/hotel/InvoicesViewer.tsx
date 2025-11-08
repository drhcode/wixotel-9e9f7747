import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink } from "lucide-react";
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
}

const InvoicesViewer = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleDownloadPDF = (invoice: Invoice) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text("INVOICE", 105, 20, { align: "center" });
      
      // Invoice Details
      doc.setFontSize(10);
      doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 40);
      doc.text(`Issue Date: ${format(new Date(invoice.issue_date), 'MMM dd, yyyy')}`, 20, 47);
      doc.text(`Due Date: ${format(new Date(invoice.due_date), 'MMM dd, yyyy')}`, 20, 54);
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 61);
      
      // Billing Period
      doc.text("Billing Period:", 20, 75);
      doc.text(`${format(new Date(invoice.billing_period_start), 'MMMM dd, yyyy')} - ${format(new Date(invoice.billing_period_end), 'MMMM dd, yyyy')}`, 20, 82);
      
      // Amount Details
      doc.text("Amount Details:", 20, 96);
      doc.text(`Subtotal: €${invoice.amount.toFixed(2)}`, 20, 103);
      doc.text(`Tax: €${invoice.tax_amount.toFixed(2)}`, 20, 110);
      doc.setFontSize(12);
      doc.text(`Total: €${invoice.total_amount.toFixed(2)}`, 20, 120);
      
      // Payment Details
      doc.setFontSize(10);
      doc.text("Payment Details:", 20, 140);
      doc.text("Bank Transfer:", 20, 150);
      doc.text("Bank Name: Pro Credit Bank Albania", 25, 157);
      doc.text("Account Name: DORJAN COCKA", 25, 164);
      doc.text("IBAN: AL25209110810000081072760202", 25, 171);
      doc.text("SWIFT: FEFAALTRXXX", 25, 178);
      
      doc.text("PayPal:", 20, 192);
      doc.text("https://www.paypal.me/DorjanCocka", 25, 199);
      
      if (invoice.notes) {
        doc.text("Notes:", 20, 215);
        doc.text(invoice.notes, 20, 222, { maxWidth: 170 });
      }
      
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
                    <TableCell className="text-right">
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

              {/* Payment Details Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Payment Details</h3>
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

                  {/* PayPal Section */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="font-medium text-sm mb-3">PayPal Payment</p>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => window.open('https://www.paypal.me/DorjanCocka', '_blank')}
                        >
                          Pay with PayPal
                        </Button>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white p-2 rounded-lg border">
                          <QRCodeSVG 
                            value="https://www.paypal.me/DorjanCocka" 
                            size={120}
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
