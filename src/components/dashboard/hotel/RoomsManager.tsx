import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

interface Props {
  hotelId: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  is_available: boolean;
}

const RoomsManager = ({ hotelId }: Props) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    capacity: "2"
  });

  useEffect(() => {
    fetchRooms();
  }, [hotelId]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      toast.error("Failed to load rooms");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            capacity: parseInt(formData.capacity)
          })
          .eq('id', editingRoom.id);

        if (error) throw error;
        toast.success("Room updated successfully");
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert({
            hotel_id: hotelId,
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            capacity: parseInt(formData.capacity)
          });

        if (error) throw error;
        toast.success("Room added successfully");
      }

      setIsDialogOpen(false);
      setEditingRoom(null);
      setFormData({ name: "", description: "", price: "", capacity: "2" });
      fetchRooms();
    } catch (error: any) {
      toast.error("Failed to save room");
      console.error(error);
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || "",
      price: room.price.toString(),
      capacity: room.capacity.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDeleteAttempt = (roomId: string) => {
    setDeletingRoom(roomId);
    setDeletePassword("");
  };

  const handleDelete = async () => {
    if (!deletingRoom) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('deletion_password')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.deletion_password) {
        toast.error("Please set up a deletion password in Settings first");
        setDeletingRoom(null);
        return;
      }

      if (profile.deletion_password !== deletePassword) {
        toast.error("Incorrect password");
        return;
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', deletingRoom);

      if (error) throw error;

      toast.success("Room deleted successfully");
      setDeletingRoom(null);
      setDeletePassword("");
      fetchRooms();
    } catch (error: any) {
      toast.error("Failed to delete room");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Rooms Management</h2>
          <p className="text-muted-foreground">Manage your hotel rooms and availability</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={() => {
              setEditingRoom(null);
              setFormData({ name: "", description: "", price: "", capacity: "2" });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoom ? "Edit Room" : "Add New Room"}</DialogTitle>
              <DialogDescription>
                {editingRoom ? "Update room details" : "Add a new room to your hotel"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Deluxe Suite"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beautiful room with ocean view..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Night ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="150.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (Guests)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingRoom ? "Update Room" : "Add Room"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{room.name}</CardTitle>
                  <CardDescription className="mt-2">{room.description}</CardDescription>
                </div>
                <Badge variant={room.is_available ? "default" : "secondary"}>
                  {room.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per night:</span>
                  <span className="font-semibold text-primary">${room.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{room.capacity} guests</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(room)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteAttempt(room.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rooms.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No rooms added yet</p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Room
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deletingRoom} onOpenChange={() => setDeletingRoom(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter your deletion password to confirm this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="delete-password">Deletion Password</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your deletion password"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeletingRoom(null);
              setDeletePassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoomsManager;
