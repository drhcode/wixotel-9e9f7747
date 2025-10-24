import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, Search, Trash2, Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import Papa from "papaparse";
import { CsvMapper, REQUIRED_FIELDS } from "@/components/csv/CsvMapper";

interface Props {
  hotelId: string;
}

const BookingsManager = ({ hotelId }: Props) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingBooking, setDeletingBooking] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [allowDataClear, setAllowDataClear] = useState(false);
  // CSV mapping state
  const [mapperOpen, setMapperOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBookings();
    fetchHotelSettings();
  }, [hotelId]);

  const fetchHotelSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('allow_data_clear')
        .eq('id', hotelId)
        .single();
      
      if (error) throw error;
      setAllowDataClear(data?.allow_data_clear || false);
    } catch (error) {
      console.error("Error fetching hotel settings:", error);
    }
  };

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

  const exportToCSV = () => {
    const headers = ['Guest Name', 'Email', 'Phone', 'Room', 'Check-in', 'Check-out', 'Amount', 'Status', 'Payment', 'Notes'];
    const csvData = filteredBookings.map(booking => [
      booking.guest_name || '',
      booking.guest_email || '',
      booking.guest_phone || '',
      booking.rooms?.name || '',
      new Date(booking.check_in).toLocaleDateString(),
      new Date(booking.check_out).toLocaleDateString(),
      `€${booking.total_amount}`,
      booking.status,
      booking.payment_status,
      booking.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `reservations-${date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'reserved':
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
  };

  // Replaced by robust PapaParse flow with column mapping
  const parseCSV = (text: string): any[] => {
    // Fallback simple parser (kept for safety); main flow uses PapaParse
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    return lines.slice(1).map((line) => {
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const row: any = {};
      headers.forEach((h, i) => (row[h] = values[i] || ''));
      return row;
    });
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
        'reserved',
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

  const handleCSVImport = async (normalizedRows: any[]) => {
    setImporting(true);
    try {
      if (normalizedRows.length === 0) {
        toast.error("No rows to import after mapping");
        return;
      }
      toast.info(`Processing ${normalizedRows.length} reservations...`);
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('import-csv', {
        body: { type: 'reservations', csvData: normalizedRows, hotelId, strict: true },
        headers: { Authorization: `Bearer ${session?.access_token}` }
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
      setMapperOpen(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    setFileName(file.name);
    // Robust CSV parse with PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/^\ufeff/, ''),
      complete: (results) => {
        const rows = (results.data as any[]).filter(Boolean);
        if (rows.length === 0) {
          toast.error("CSV file is empty or invalid");
          return;
        }
        const headers = results.meta.fields as string[] || Object.keys(rows[0]);
        setCsvHeaders(headers);
        setCsvRows(rows);
        setMapperOpen(true);
      },
      error: (err) => {
        console.error('CSV parse error', err);
        toast.error("Failed to parse CSV");
      }
    });
  };

  const buildNormalizedRows = (mapping: Record<string, string | null>) => {
    const required = new Set(REQUIRED_FIELDS);
    const normalized = csvRows.map((row) => {
      const out: any = {};
      Object.entries(mapping).forEach(([canonical, src]) => {
        if (!src) return;
        out[canonical] = row[src];
      });
      return out;
    }).filter((row) => Array.from(required).every((f) => row[f] !== undefined && row[f] !== null && String(row[f]).trim() !== ""));
    return normalized;
  };

  const handleDelete = async () => {
    if (!deletingBooking) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', deletingBooking);

      if (error) throw error;

      toast.success("Booking deleted successfully");
      setDeletingBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error("Failed to delete booking");
      console.error(error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ Are you sure you want to delete ALL bookings and guests? This cannot be undone.')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('clear-hotel-data');
      
      if (error) throw error;
      
      toast.success(`Cleared ${data.bookingsDeleted} bookings and ${data.guestsDeleted} guests`);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear data');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Bookings Management</h2>
          <p className="text-muted-foreground">View and manage all bookings · Total: {bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {allowDataClear && (
            <Button
              variant="destructive"
              onClick={handleClearAll}
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          )}
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredBookings.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
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
                if (file) handleFileSelected(file);
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

      <Card className="border-muted bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📋 CSV Import Requirements
          </CardTitle>
          <CardDescription className="text-xs space-y-2 mt-2">
            <div className="bg-background rounded-lg p-3 space-y-2">
              <div>
                <p className="font-semibold text-foreground mb-1">Required Fields (must be present):</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li><code className="bg-muted px-1 rounded">guest_name</code> - Full name of the guest</li>
                  <li><code className="bg-muted px-1 rounded">guest_phone</code> - Phone number with country code (e.g., +1234567890)</li>
                  <li><code className="bg-muted px-1 rounded">room_number</code> - Room identifier (e.g., 101, 102)</li>
                  <li><code className="bg-muted px-1 rounded">check_in</code> - Check-in date in YYYY-MM-DD format</li>
                  <li><code className="bg-muted px-1 rounded">check_out</code> - Check-out date in YYYY-MM-DD format</li>
                  <li><code className="bg-muted px-1 rounded">total_amount</code> - Total booking amount (e.g., 500.00)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Optional Fields:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li><code className="bg-muted px-1 rounded">guest_email</code> - Email address</li>
                  <li><code className="bg-muted px-1 rounded">guest_country</code>, <code className="bg-muted px-1 rounded">guest_city</code>, <code className="bg-muted px-1 rounded">guest_address</code> - Guest location info</li>
                  <li><code className="bg-muted px-1 rounded">status</code> - pending | reserved | checked_in | checked_out | cancelled</li>
                  <li><code className="bg-muted px-1 rounded">payment_status</code> - pending | paid | refunded</li>
                  <li><code className="bg-muted px-1 rounded">notes</code> - Additional notes or special requests</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2 text-primary bg-primary/10 rounded-lg p-2 mt-2">
              <span>💡</span>
              <span>Download the template above to see the exact format with example data. You can then map any CSV headers to these fields during import.</span>
            </div>
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
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.map((booking) => (
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
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {booking.notes || '-'}
                    </TableCell>
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
        {filteredBookings.length > 0 && (
          <div className="px-6 pb-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {/* First page */}
                {totalPages > 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setCurrentPage(1)}
                      isActive={currentPage === 1}
                      className="cursor-pointer"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis after first page */}
                {currentPage > 3 && totalPages > 5 && (
                  <PaginationItem>
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                  </PaginationItem>
                )}
                
                {/* Middle pages */}
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  const showPage = page > 1 && page < totalPages && 
                    Math.abs(page - currentPage) <= 1;
                  
                  if (!showPage) return null;
                  
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {/* Ellipsis before last page */}
                {currentPage < totalPages - 2 && totalPages > 5 && (
                  <PaginationItem>
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                  </PaginationItem>
                )}
                
                {/* Last page */}
                {totalPages > 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setCurrentPage(totalPages)}
                      isActive={currentPage === totalPages}
                      className="cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      <AlertDialog open={!!deletingBooking} onOpenChange={() => setDeletingBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingBooking(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CsvMapper
        open={mapperOpen}
        headers={csvHeaders}
        previewRows={csvRows}
        onCancel={() => setMapperOpen(false)}
        onConfirm={(mapping) => {
          const normalized = buildNormalizedRows(mapping as any);
          if (normalized.length === 0) {
            toast.error("No valid rows after mapping. Ensure required fields are mapped and not empty.");
            return;
          }
          handleCSVImport(normalized);
        }}
      />
    </div>
  );
};

export default BookingsManager;
