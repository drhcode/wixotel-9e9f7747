import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Send, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  hotel_id: string;
  subscription_id: string | null;
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
  hotels: { name: string; email: string };
}

interface Subscription {
  id: string;
  hotel_id: string;
  start_date: string;
  end_date: string;
  hotels: { name: string };
  subscription_plans: { name: string; price: number };
}

const InvoicesManagement = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const [formData, setFormData] = useState({
    hotel_id: "",
    subscription_id: "",
    amount: "",
    tax_amount: "0",
    billing_period_start: new Date().toISOString().split('T')[0],
    billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "pending" as "pending" | "paid" | "overdue" | "cancelled",
    notes: ""
  });

  useEffect(() => {
    fetchInvoices();
    fetchSubscriptions();
    fetchHotels();
  }, []);

  useEffect(() => {
    if (formData.subscription_id) {
      const sub = subscriptions.find(s => s.id === formData.subscription_id);
      if (sub) {
        setSelectedSubscription(sub);
        setFormData(prev => ({
          ...prev,
          hotel_id: sub.hotel_id,
          amount: sub.subscription_plans.price.toString(),
          billing_period_start: sub.start_date,
          billing_period_end: sub.end_date
        }));
      }
    }
  }, [formData.subscription_id, subscriptions]);

  const fetchHotels = async () => {
    const { data } = await supabase
      .from('hotels')
      .select('id, name, email')
      .order('name');
    setHotels(data || []);
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, hotels(name), subscription_plans(name, price)')
      .order('created_at', { ascending: false });
    setSubscriptions(data || []);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, hotels(name, email)')
      .order('created_at', { ascending: false });
    setInvoices(data || []);
  };

  const calculateTotalAmount = () => {
    const amount = parseFloat(formData.amount) || 0;
    const tax = parseFloat(formData.tax_amount) || 0;
    return amount + tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const totalAmount = calculateTotalAmount();

      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update({
            hotel_id: formData.hotel_id,
            subscription_id: formData.subscription_id || null,
            amount: parseFloat(formData.amount),
            tax_amount: parseFloat(formData.tax_amount),
            total_amount: totalAmount,
            billing_period_start: formData.billing_period_start,
            billing_period_end: formData.billing_period_end,
            due_date: formData.due_date,
            status: formData.status,
            notes: formData.notes || null
          })
          .eq('id', editingInvoice.id);

        if (error) throw error;
        toast.success("Invoice updated successfully");
      } else {
        // Generate invoice number
        const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

        const { error } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            hotel_id: formData.hotel_id,
            subscription_id: formData.subscription_id || null,
            amount: parseFloat(formData.amount),
            tax_amount: parseFloat(formData.tax_amount),
            total_amount: totalAmount,
            billing_period_start: formData.billing_period_start,
            billing_period_end: formData.billing_period_end,
            due_date: formData.due_date,
            status: formData.status,
            notes: formData.notes || null
          });

        if (error) throw error;
        toast.success("Invoice created successfully");
      }

      setIsModalOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete invoice");
    } else {
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          hotel_id: invoice.hotel_id,
          recipient_email: invoice.hotels.email,
          subject: `Invoice ${invoice.invoice_number}`,
          html_content: `
            <h2>Invoice ${invoice.invoice_number}</h2>
            <p>Dear ${invoice.hotels.name},</p>
            <p>Please find your invoice details below:</p>
            <ul>
              <li><strong>Invoice Number:</strong> ${invoice.invoice_number}</li>
              <li><strong>Amount:</strong> €${invoice.amount}</li>
              <li><strong>Tax:</strong> €${invoice.tax_amount}</li>
              <li><strong>Total:</strong> €${invoice.total_amount}</li>
              <li><strong>Due Date:</strong> ${format(new Date(invoice.due_date), 'MMM dd, yyyy')}</li>
              <li><strong>Billing Period:</strong> ${format(new Date(invoice.billing_period_start), 'MMM dd, yyyy')} - ${format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}</li>
            </ul>
            ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            <p>Thank you for your business!</p>
          `,
          email_type: 'invoice'
        }
      });

      if (error) throw error;
      toast.success("Invoice sent successfully");
    } catch (error: any) {
      toast.error("Failed to send invoice: " + error.message);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      hotel_id: invoice.hotel_id,
      subscription_id: invoice.subscription_id || "",
      amount: invoice.amount.toString(),
      tax_amount: invoice.tax_amount.toString(),
      billing_period_start: invoice.billing_period_start,
      billing_period_end: invoice.billing_period_end,
      due_date: invoice.due_date,
      status: invoice.status as "pending" | "paid" | "overdue" | "cancelled",
      notes: invoice.notes || ""
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingInvoice(null);
    setSelectedSubscription(null);
    setFormData({
      hotel_id: "",
      subscription_id: "",
      amount: "",
      tax_amount: "0",
      billing_period_start: new Date().toISOString().split('T')[0],
      billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "pending",
      notes: ""
    });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoices Management</h2>
          <p className="text-muted-foreground">Create and manage hotel invoices</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>From Subscription (Optional)</Label>
                <Select 
                  value={formData.subscription_id} 
                  onValueChange={(value) => setFormData({ ...formData, subscription_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscription (or create manually)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None - Create manually</SelectItem>
                    {subscriptions.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.hotels.name} - {sub.subscription_plans.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Hotel *</Label>
                <Select 
                  value={formData.hotel_id} 
                  onValueChange={(value) => setFormData({ ...formData, hotel_id: value })}
                  disabled={!!formData.subscription_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map(hotel => (
                      <SelectItem key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    disabled={!!formData.subscription_id}
                  />
                </div>
                <div>
                  <Label>Tax Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold">Total Amount: €{calculateTotalAmount().toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Billing Period Start *</Label>
                  <Input
                    type="date"
                    value={formData.billing_period_start}
                    onChange={(e) => setFormData({ ...formData, billing_period_start: e.target.value })}
                    required
                    disabled={!!formData.subscription_id}
                  />
                </div>
                <div>
                  <Label>Billing Period End *</Label>
                  <Input
                    type="date"
                    value={formData.billing_period_end}
                    onChange={(e) => setFormData({ ...formData, billing_period_end: e.target.value })}
                    required
                    disabled={!!formData.subscription_id}
                  />
                </div>
              </div>

              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: "pending" | "paid" | "overdue" | "cancelled") => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingInvoice ? "Update" : "Create"} Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.hotels?.name}</TableCell>
                  <TableCell>€{invoice.amount}</TableCell>
                  <TableCell className="font-semibold">€{invoice.total_amount}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(invoice.billing_period_start), 'MMM dd')} - {format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleSendInvoice(invoice)}
                        title="Send invoice via email"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(invoice.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesManagement;
