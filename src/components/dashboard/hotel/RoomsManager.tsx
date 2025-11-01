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
import { Checkbox } from "@/components/ui/checkbox";
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
import { z } from "zod";
import { mapDatabaseError } from "@/lib/errorUtils";

const AVAILABLE_AMENITIES = [
  "Free WiFi",
  "Air Conditioning",
  "Heating",
  "TV",
  "Mini Bar",
  "Coffee Maker",
  "Safe",
  "Hair Dryer",
  "Iron & Ironing Board",
  "Telephone",
  "Desk & Chair",
  "Balcony",
  "Sea View",
  "City View",
  "Mountain View",
  "Bathtub",
  "Shower",
  "Towels",
  "Toiletries",
  "Bathrobe & Slippers",
  "Room Service",
  "Daily Housekeeping",
  "Wake-up Service",
  "Blackout Curtains",
  "Soundproofing"
];

const roomSchema = z.object({
  name: z.string().trim().min(1, "Room name is required").max(100, "Name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  price: z.string().min(1, "Price is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 100000;
  }, "Price must be between 0 and 100,000"),
  capacity: z.string().min(1, "Capacity is required").refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 50;
  }, "Capacity must be between 1 and 50"),
  square_meters: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Square meters must be positive"),
});

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
  square_meters: number | null;
  main_photo_url: string | null;
  images: string[] | null;
  amenities: string[] | null;
}

const RoomsManager = ({ hotelId }: Props) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [hotelPlan, setHotelPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    capacity: "2",
    square_meters: ""
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [mainPhoto, setMainPhoto] = useState<string>("");
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRooms();
    fetchHotelPlan();
  }, [hotelId]);

  const getRoomLimit = (plan: string | null) => {
    switch (plan) {
      case 'basic':
        return 10;
      case 'pro':
        return 25;
      case 'premium':
        return null; // unlimited
      default:
        return 10; // default to basic
    }
  };

  const fetchHotelPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('subscription_plan')
        .eq('id', hotelId)
        .single();

      if (error) throw error;
      setHotelPlan(data.subscription_plan);
    } catch (error: any) {
      console.error(error);
    }
  };

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

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${hotelId}/main_${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('hotel-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hotel-assets')
        .getPublicUrl(fileName);

      setMainPhoto(publicUrl);
      toast.success("Main photo uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload main photo");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${hotelId}/gallery_${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('hotel-assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('hotel-assets')
          .getPublicUrl(fileName);

        urls.push(publicUrl);
      }

      setGalleryPhotos([...galleryPhotos, ...urls]);
      toast.success(`${urls.length} gallery photo(s) uploaded successfully`);
    } catch (error: any) {
      toast.error("Failed to upload gallery photos");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryPhoto = (url: string) => {
    setGalleryPhotos(galleryPhotos.filter(p => p !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = roomSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            capacity: parseInt(formData.capacity),
            square_meters: formData.square_meters ? parseFloat(formData.square_meters) : null,
            amenities: selectedAmenities,
            images: galleryPhotos.length > 0 ? galleryPhotos : editingRoom.images,
            main_photo_url: mainPhoto || editingRoom.main_photo_url
          })
          .eq('id', editingRoom.id);

        if (error) throw error;
        toast.success("Room updated successfully");
      } else {
        // Check room limit before adding new room
        const roomLimit = getRoomLimit(hotelPlan);
        if (roomLimit !== null && rooms.length >= roomLimit) {
          toast.error(`Room limit reached for your ${hotelPlan} plan (${roomLimit} rooms max). Upgrade to add more rooms.`);
          return;
        }

        const { error } = await supabase
          .from('rooms')
          .insert({
            hotel_id: hotelId,
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            capacity: parseInt(formData.capacity),
            square_meters: formData.square_meters ? parseFloat(formData.square_meters) : null,
            amenities: selectedAmenities,
            images: galleryPhotos,
            main_photo_url: mainPhoto
          });

        if (error) throw error;
        toast.success("Room added successfully");
      }

      setIsDialogOpen(false);
      setEditingRoom(null);
      setFormData({ name: "", description: "", price: "", capacity: "2", square_meters: "" });
      setSelectedAmenities([]);
      setMainPhoto("");
      setGalleryPhotos([]);
      fetchRooms();
    } catch (error: any) {
      toast.error(mapDatabaseError(error));
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || "",
      price: room.price.toString(),
      capacity: room.capacity.toString(),
      square_meters: room.square_meters?.toString() || ""
    });
    setSelectedAmenities(room.amenities || []);
    setMainPhoto(room.main_photo_url || "");
    setGalleryPhotos(room.images || []);
    setIsDialogOpen(true);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleDeleteAttempt = (roomId: string) => {
    setDeletingRoom(roomId);
  };

  const handleDelete = async () => {
    if (!deletingRoom) return;

    try {
      // Check for upcoming or active bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, check_out, status')
        .eq('room_id', deletingRoom)
        .in('status', ['pending', 'reserved', 'checked_in']);

      if (bookingsError) throw bookingsError;

      if (bookings && bookings.length > 0) {
        toast.error("Cannot delete room with active or upcoming reservations");
        setDeletingRoom(null);
        return;
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', deletingRoom);

      if (error) throw error;

      toast.success("Room deleted successfully");
      setDeletingRoom(null);
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
          <p className="text-muted-foreground">
            Manage your hotel rooms and availability
            {hotelPlan && (
              <span className="ml-2">
                ({rooms.length}/{getRoomLimit(hotelPlan) || '∞'} rooms used - {hotelPlan} plan)
              </span>
            )}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={() => {
              setEditingRoom(null);
              setFormData({ name: "", description: "", price: "", capacity: "2", square_meters: "" });
              setSelectedAmenities([]);
              setMainPhoto("");
              setGalleryPhotos([]);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{editingRoom ? "Edit Room" : "Add New Room"}</DialogTitle>
              <DialogDescription className="text-sm">
                {editingRoom ? "Update room details" : "Add a new room to your hotel"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Room Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Deluxe Suite"
                  required
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beautiful room with ocean view..."
                  rows={3}
                  className="text-base resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium">Price per Night (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="150.00"
                    required
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-sm font-medium">Capacity (Guests)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    required
                    className="text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="square_meters" className="text-sm font-medium">Room Size (m²)</Label>
                <Input
                  id="square_meters"
                  type="number"
                  step="0.01"
                  value={formData.square_meters}
                  onChange={(e) => setFormData({ ...formData, square_meters: e.target.value })}
                  placeholder="25.00"
                  className="text-base"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Amenities</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-3 border rounded-md">
                  {AVAILABLE_AMENITIES.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity}
                        checked={selectedAmenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <label
                        htmlFor={amenity}
                        className="text-sm cursor-pointer select-none"
                      >
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedAmenities.length} amenities selected
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="main_photo" className="text-sm font-medium">Main Photo</Label>
                <Input
                  id="main_photo"
                  type="file"
                  accept="image/*"
                  onChange={handleMainPhotoUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {mainPhoto && (
                  <div className="relative group mt-2">
                    <img src={mainPhoto} alt="Main photo" className="w-full h-32 sm:h-40 object-cover rounded border" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => setMainPhoto("")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery" className="text-sm font-medium">Gallery Photos</Label>
                <Input
                  id="gallery"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {uploading && <p className="text-sm text-muted-foreground animate-pulse">Uploading...</p>}
                {galleryPhotos.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium">Gallery Photos ({galleryPhotos.length}):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {galleryPhotos.map((url, index) => (
                        <div key={url} className="relative group">
                          <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-20 sm:h-24 object-cover rounded border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeGalleryPhoto(url)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full text-base py-5 sm:py-6" disabled={uploading}>
                {editingRoom ? "Update Room" : "Add Room"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Card key={room.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">{room.description}</CardDescription>
                </div>
                <Badge variant={room.is_available ? "default" : "secondary"}>
                  {room.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-3 flex-1">
                {room.main_photo_url && (
                  <img src={room.main_photo_url} alt={room.name} className="w-full h-32 object-cover rounded" />
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per night:</span>
                  <span className="font-semibold text-primary">€{room.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{room.capacity} guests</span>
                </div>
                {room.square_meters && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-medium">{room.square_meters} m²</span>
                  </div>
                )}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Amenities:</span>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.map((amenity, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4 mt-auto">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(room)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteAttempt(room.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
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
              Are you sure you want to delete this room? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRoom(null)}>
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
