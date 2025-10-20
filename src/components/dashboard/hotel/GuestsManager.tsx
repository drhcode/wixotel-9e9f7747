import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";

interface Props {
  hotelId: string;
}

const GuestsManager = ({ hotelId }: Props) => {
  const [guests, setGuests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingGuest, setDeletingGuest] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    fetchGuests();
  }, [hotelId]);

  const fetchGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error("Error fetching guests:", error);
    }
  };

  const filteredGuests = guests.filter((guest) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      guest.name?.toLowerCase().includes(searchLower) ||
      guest.email?.toLowerCase().includes(searchLower) ||
      guest.phone?.toLowerCase().includes(searchLower) ||
      guest.id_number?.toLowerCase().includes(searchLower) ||
      guest.country?.toLowerCase().includes(searchLower) ||
      guest.city?.toLowerCase().includes(searchLower) ||
      guest.address?.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteAttempt = (guestId: string) => {
    setDeletingGuest(guestId);
    setDeletePassword("");
  };

  const handleDelete = async () => {
    if (!deletingGuest) return;

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
        setDeletingGuest(null);
        return;
      }

      if (profile.deletion_password !== deletePassword) {
        toast.error("Incorrect password");
        return;
      }

      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', deletingGuest);

      if (error) throw error;

      toast.success("Guest deleted successfully");
      setDeletingGuest(null);
      setDeletePassword("");
      fetchGuests();
    } catch (error: any) {
      toast.error("Failed to delete guest");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Guests Management</h2>
        <p className="text-muted-foreground">View and manage guest information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Guests</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredGuests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? "No guests found" : "No guests registered yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-medium">{guest.name}</TableCell>
                    <TableCell>{guest.email || '-'}</TableCell>
                    <TableCell>{guest.phone}</TableCell>
                    <TableCell>{guest.id_number || '-'}</TableCell>
                    <TableCell>{guest.country || '-'}</TableCell>
                    <TableCell>{guest.city || '-'}</TableCell>
                    <TableCell>{guest.address || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttempt(guest.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingGuest} onOpenChange={() => setDeletingGuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
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
              setDeletingGuest(null);
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

export default GuestsManager;
