import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Eye, EyeOff, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const hotelSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().regex(/^[+\d\s()-]{7,20}$/),
  address: z.string().trim().min(5).max(500),
  description: z.string().max(2000).optional(),
  password: z.string().min(8).max(100).regex(/[A-Z]/).regex(/[0-9]/).optional(),
});

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
}

interface Hotel {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  status: string;
  subscription_plan: string;
  plan_id: string;
  description: string;
  owner_id: string;
  show_on_landing: boolean;
  is_verified: boolean;
  is_featured: boolean;
  city: string | null;
  country: string | null;
  subscription_plans?: { name: string; price: number };
}

const HotelManagement = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [viewingHotel, setViewingHotel] = useState<Hotel | null>(null);
  const [hotelRooms, setHotelRooms] = useState<any[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    description: "",
    password: "",
    status: "pending" as "pending" | "active" | "suspended",
    plan_id: ""
  });

  useEffect(() => {
    fetchHotels();
    fetchPlans();
  }, []);

  useEffect(() => {
    const filtered = hotels.filter(hotel =>
      hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredHotels(filtered);
  }, [searchTerm, hotels]);

  const fetchHotels = async () => {
    const { data } = await supabase
      .from('hotels')
      .select('*, subscription_plans(name, price)')
      .order('created_at', { ascending: false });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validationData: any = { ...formData, description: formData.description || undefined };
      if (!editingHotel) validationData.password = formData.password;
      
      const validation = hotelSchema.safeParse(validationData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      if (editingHotel) {
        const { error } = await supabase.from('hotels').update({
            name: validation.data.name,
            address: validation.data.address,
            email: validation.data.email,
            phone: validation.data.phone,
            description: validation.data.description || null,
            status: formData.status,
            plan_id: formData.plan_id
          }).eq('id', editingHotel.id);
        if (error) throw error;
        toast.success("Hotel updated");
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password!,
          options: {
            data: {
              full_name: formData.name
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user account");

        // Create hotel with the new user as owner
        const { error: hotelError } = await supabase
          .from('hotels')
          .insert({
            name: formData.name,
            address: formData.address,
            email: formData.email,
            phone: formData.phone,
            description: formData.description,
            status: formData.status,
            plan_id: formData.plan_id,
            owner_id: authData.user.id
          });

        if (hotelError) throw hotelError;
        toast.success("Hotel and admin account created successfully");
      }

      setIsModalOpen(false);
      resetForm();
      fetchHotels();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hotel?")) return;

    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete hotel");
    } else {
      toast.success("Hotel deleted successfully");
      fetchHotels();
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      address: hotel.address,
      email: hotel.email,
      phone: hotel.phone,
      description: hotel.description,
      password: "",
      status: hotel.status as "pending" | "active" | "suspended",
      plan_id: hotel.plan_id
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingHotel(null);
    const defaultPlanId = plans.length > 0 ? plans[0].id : "";
    setFormData({
      name: "",
      address: "",
      email: "",
      phone: "",
      description: "",
      password: "",
      status: "pending" as "pending" | "active" | "suspended",
      plan_id: defaultPlanId
    });
  };

  const toggleShowOnLanding = async (hotelId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('hotels')
      .update({ show_on_landing: !currentValue })
      .eq('id', hotelId);

    if (error) {
      toast.error("Failed to update landing page visibility");
    } else {
      toast.success(currentValue ? "Hotel hidden from landing page" : "Hotel visible on landing page");
      fetchHotels();
    }
  };

  const toggleVerified = async (hotelId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('hotels')
      .update({ is_verified: !currentValue })
      .eq('id', hotelId);

    if (error) {
      toast.error("Failed to update verification status");
    } else {
      toast.success(currentValue ? "Hotel unverified" : "Hotel verified");
      fetchHotels();
    }
  };

  const toggleFeatured = async (hotelId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('hotels')
      .update({ is_featured: !currentValue })
      .eq('id', hotelId);

    if (error) {
      toast.error("Failed to update featured status");
    } else {
      toast.success(currentValue ? "Hotel removed from featured" : "Hotel marked as featured");
      fetchHotels();
    }
  };

  const handleViewDetails = async (hotel: Hotel) => {
    setViewingHotel(hotel);
    
    // Fetch hotel rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotel.id)
      .order('created_at', { ascending: true });
    
    setHotelRooms(rooms || []);
    setIsViewModalOpen(true);
  };

  const handleApprove = async (hotelId: string) => {
    const { error } = await supabase
      .from('hotels')
      .update({ status: 'active' })
      .eq('id', hotelId);

    if (error) {
      toast.error("Failed to approve hotel");
    } else {
      toast.success("Hotel approved successfully!");
      setIsViewModalOpen(false);
      fetchHotels();
    }
  };

  const handleReject = async (hotelId: string) => {
    if (!confirm("Are you sure you want to reject this hotel registration?")) return;

    const { error } = await supabase
      .from('hotels')
      .update({ status: 'suspended' })
      .eq('id', hotelId);

    if (error) {
      toast.error("Failed to reject hotel");
    } else {
      toast.success("Hotel registration rejected");
      setIsViewModalOpen(false);
      fetchHotels();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Hotel Management</h2>
          <p className="text-muted-foreground">Create and manage hotels</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingHotel ? "Edit Hotel" : "Create Hotel"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Hotel Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingHotel}
                />
              </div>

              {!editingHotel && (
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: "pending" | "active" | "suspended") => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="plan">Subscription Plan</Label>
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
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingHotel ? "Update" : "Create"} Hotel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hotels by name, email, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Landing</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {hotel.city && <div>{hotel.city}</div>}
                      {hotel.country && <div className="text-muted-foreground">{hotel.country}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{hotel.email}</div>
                      <div className="text-muted-foreground">{hotel.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={hotel.status === 'active' ? 'default' : hotel.status === 'pending' ? 'secondary' : 'destructive'}>
                      {hotel.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {hotel.subscription_plans?.name || hotel.subscription_plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={hotel.show_on_landing}
                      onCheckedChange={() => toggleShowOnLanding(hotel.id, hotel.show_on_landing)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={hotel.is_verified}
                      onCheckedChange={() => toggleVerified(hotel.id, hotel.is_verified)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={hotel.is_featured}
                      onCheckedChange={() => toggleFeatured(hotel.id, hotel.is_featured)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleViewDetails(hotel)} title="View Details">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(hotel)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(hotel.id)} title="Delete">
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

      {/* View Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-popover">
          <DialogHeader>
            <DialogTitle className="text-2xl">Hotel Registration Details</DialogTitle>
          </DialogHeader>
          
          {viewingHotel && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant={viewingHotel.status === 'active' ? 'default' : viewingHotel.status === 'pending' ? 'secondary' : 'destructive'}
                  className="text-lg px-4 py-2"
                >
                  {viewingHotel.status}
                </Badge>
                
                {viewingHotel.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(viewingHotel.id)} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button onClick={() => handleReject(viewingHotel.id)} variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Hotel Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Hotel Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Hotel Name</Label>
                    <p className="font-medium">{viewingHotel.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{viewingHotel.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{viewingHotel.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">City</Label>
                    <p className="font-medium">{viewingHotel.city || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Country</Label>
                    <p className="font-medium">{viewingHotel.country || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Subscription Plan</Label>
                    <p className="font-medium">{viewingHotel.subscription_plans?.name || viewingHotel.subscription_plan}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{viewingHotel.address}</p>
                  </div>
                  {viewingHotel.description && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="font-medium">{viewingHotel.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Rooms */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Rooms ({hotelRooms.length})</h3>
                {hotelRooms.length > 0 ? (
                  <div className="space-y-3">
                    {hotelRooms.map((room, index) => (
                      <Card key={room.id} className="bg-accent/20">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-semibold text-lg">{room.name}</p>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Capacity: {room.capacity} guests</span>
                                {room.room_number && <span>Room #{room.room_number}</span>}
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-primary">€{room.price}<span className="text-sm font-normal">/night</span></p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No rooms registered yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelManagement;
