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
import { Plus, Edit, Trash2, Search, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";

const hotelSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().regex(/^[+\d\s()-]{7,20}$/),
  address: z.string().trim().min(5).max(500),
  description: z.string().max(2000).optional(),
  password: z.string().min(8).max(100).regex(/[A-Z]/).regex(/[0-9]/).optional(),
});

interface Hotel {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  status: string;
  subscription_plan: string;
  description: string;
  owner_id: string;
  show_on_landing: boolean;
  city: string | null;
  country: string | null;
}

const HotelManagement = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    description: "",
    password: "",
    status: "pending" as "pending" | "active" | "suspended",
    subscription_plan: "basic" as "basic" | "pro" | "premium"
  });

  useEffect(() => {
    fetchHotels();
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
      .select('*')
      .order('created_at', { ascending: false });
    setHotels(data || []);
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
            subscription_plan: formData.subscription_plan
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
            subscription_plan: formData.subscription_plan,
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
      subscription_plan: hotel.subscription_plan as "basic" | "pro" | "premium"
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingHotel(null);
    setFormData({
      name: "",
      address: "",
      email: "",
      phone: "",
      description: "",
      password: "",
      status: "pending" as "pending" | "active" | "suspended",
      subscription_plan: "basic" as "basic" | "pro" | "premium"
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
                  <Select value={formData.subscription_plan} onValueChange={(value: "basic" | "pro" | "premium") => setFormData({ ...formData, subscription_plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
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
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Landing Page</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{hotel.email}</div>
                      <div className="text-muted-foreground">{hotel.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{hotel.address}</TableCell>
                  <TableCell>
                    <Badge variant={hotel.status === 'active' ? 'default' : 'secondary'}>
                      {hotel.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{hotel.subscription_plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={hotel.show_on_landing}
                        onCheckedChange={() => toggleShowOnLanding(hotel.id, hotel.show_on_landing)}
                      />
                      {hotel.show_on_landing ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(hotel)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(hotel.id)}>
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

export default HotelManagement;
