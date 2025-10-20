import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, Search, Trash2, Upload, Loader2 } from "lucide-react";
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

const BookingsManager = ({ hotelId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingBooking, setDeletingBooking] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [hotelId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, rooms(name)')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.guest_name?.toLowerCase().includes(searchLower) ||
      booking.guest_email?.toLowerCase().includes(searchLower) ||
      booking.rooms?.name?.toLowerCase().includes(searchLower) ||
      booking.status?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'checked_in':
        return 'secondary';
      case 'checked_out':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleDeleteAttempt = (bookingId: string) => {
    setDeletingBooking(bookingId);
    setDeletePassword("");
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const downloadTemplate = () => {
    const headers = [
      'guest_name',
      'guest_phone',
      'guest_email',
      'guest_country',
      'guest_city',
      'guest_address',
      'room_number',
      'check_in',
      'check_out',
      'total_amount',
      'status',
      'payment_status',
      'notes'
    ];
    
    const exampleRows = [
      [
        'John Doe',
        '+1234567890',
        'john@example.com',
        'USA',
        'New York',
        '123 Main St',
        '101',
        '2024-01-15',
        '2024-01-20',
        '500.00',
        'confirmed',
        'paid',
        'Early check-in requested'
      ],
      [
        'Jane Smith',
        '+9876543210',
        'jane@example.com',
        'UK',
        'London',
        '456 Park Ave',
        '102',
        '2024-01-18',
        '2024-01-22',
        '750.00',
        'pending',
        'pending',
        ''
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'reservations_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Template downloaded successfully');
  };

  const handleCSVImport = async (file: File) => {
    setImporting(true);
    
    try {
      const text = await file.text();
      const csvData = parseCSV(text);

      if (csvData.length === 0) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      toast.info(`Processing ${csvData.length} reservations...`);

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-csv', {
        body: { type: 'reservations', csvData, hotelId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        fetchBookings();
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || "Failed to import reservations");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBooking) return;

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
        setDeletingBooking(null);
        return;
      }

      if (profile.deletion_password !== deletePassword) {
        toast.error("Incorrect password");
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', deletingBooking);

      if (error) throw error;

      toast.success("Booking deleted successfully");
      setDeletingBooking(null);
      setDeletePassword("");
      fetchBookings();
    } catch (error: any) {
      toast.error("Failed to delete booking");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Bookings Management</h2>
          <p className="text-muted-foreground">View and manage all bookings</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
          >
            <Upload className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <label htmlFor="csv-upload">
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCSVImport(file);
              }}
              disabled={importing}
            />
            <Button
              variant="default"
              disabled={importing}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Import CSV
            </Button>
          </label>
        </div>
      </div>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-sm font-medium">CSV Import Instructions</CardTitle>
          <CardDescription className="text-xs space-y-1">
            <p><strong>Required columns:</strong> guest_name, guest_phone, room_number, check_in, check_out, total_amount</p>
            <p><strong>Optional columns:</strong> guest_email, guest_country, guest_city, guest_address, status, payment_status, notes</p>
            <p><strong>Date format:</strong> YYYY-MM-DD (e.g., 2024-01-15)</p>
            <p><strong>Status values:</strong> pending, confirmed, checked_in, checked_out, cancelled</p>
            <p className="text-primary">💡 Download the template above to see the correct format with examples</p>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest, room, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? "No bookings found" : "No bookings yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.guest_name}</TableCell>
                    <TableCell>{booking.rooms?.name}</TableCell>
                    <TableCell>{new Date(booking.check_in).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(booking.check_out).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>€{booking.total_amount}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttempt(booking.id)}
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

      <AlertDialog open={!!deletingBooking} onOpenChange={() => setDeletingBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
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
              setDeletingBooking(null);
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

export default BookingsManager;
