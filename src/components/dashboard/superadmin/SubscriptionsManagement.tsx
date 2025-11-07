import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Subscription {
  id: string;
  hotel_id: string;
  plan: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  hotels: { name: string };
  subscription_plans: { name: string; price: number };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
}

const SubscriptionsManagement = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  const [formData, setFormData] = useState({
    hotel_id: "",
    plan_id: "",
    status: "pending" as "pending" | "failed" | "refunded" | "completed",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchHotels();
    fetchPlans();
  }, []);

  const fetchHotels = async () => {
    const { data } = await supabase
      .from('hotels')
      .select('id, name')
      .order('name');
    setHotels(data || []);
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, price')
      .eq('is_active', true)
      .order('price', { ascending: true });
    setPlans(data || []);
    
    // Set default plan if available
    if (data && data.length > 0 && !formData.plan_id) {
      setFormData(prev => ({ ...prev, plan_id: data[0].id }));
    }
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, hotels(name), subscription_plans(name, price)')
      .order('created_at', { ascending: false });
    setSubscriptions(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSubscription) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            hotel_id: formData.hotel_id,
            plan_id: formData.plan_id,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date
          } as any)
          .eq('id', editingSubscription.id);

        if (error) throw error;
        toast.success("Subscription updated successfully");
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            hotel_id: formData.hotel_id,
            plan_id: formData.plan_id,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date
          } as any);

        if (error) throw error;
        toast.success("Subscription created successfully");
      }

      setIsModalOpen(false);
      resetForm();
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete subscription");
    } else {
      toast.success("Subscription deleted successfully");
      fetchSubscriptions();
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      hotel_id: subscription.hotel_id,
      plan_id: subscription.plan_id,
      status: subscription.status as "pending" | "failed" | "refunded" | "completed",
      start_date: subscription.start_date,
      end_date: subscription.end_date
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingSubscription(null);
    const defaultPlanId = plans.length > 0 ? plans[0].id : "";
    setFormData({
      hotel_id: "",
      plan_id: defaultPlanId,
      status: "pending" as "pending" | "failed" | "refunded" | "completed",
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Subscriptions Management</h2>
          <p className="text-muted-foreground">Manage hotel subscriptions</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubscription ? "Edit Subscription" : "Create Subscription"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="hotel">Hotel *</Label>
                <Select value={formData.hotel_id} onValueChange={(value) => setFormData({ ...formData, hotel_id: value })}>
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

              <div>
                <Label htmlFor="plan">Plan *</Label>
                <Select value={formData.plan_id} onValueChange={(value) => setFormData({ ...formData, plan_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - €{plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: "pending" | "failed" | "refunded" | "completed") => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSubscription ? "Update" : "Create"} Subscription
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
                <TableHead>Hotel</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-medium">{subscription.hotels?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {subscription.subscription_plans?.name || subscription.plan || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.status === 'paid' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(subscription.start_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(subscription.end_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(subscription)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(subscription.id)}>
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

export default SubscriptionsManagement;
