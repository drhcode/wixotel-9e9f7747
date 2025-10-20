import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  hotelId: string;
}

const ImportCSV = ({ hotelId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

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

  const handleFileUpload = async (type: 'hotels' | 'rooms' | 'reservations', file: File) => {
    setLoading(true);
    setResults(null);

    try {
      const text = await file.text();
      const csvData = parseCSV(text);

      if (csvData.length === 0) {
        toast.error("CSV file is empty or invalid");
        setLoading(false);
        return;
      }

      toast.info(`Processing ${csvData.length} ${type}...`);

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-csv', {
        body: { type, csvData },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      setResults(data);
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || "Failed to import data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Import MySQL Data</h2>
        <p className="text-muted-foreground">
          Upload CSV files exported from your MySQL database. Import in order: Hotels → Rooms → Reservations
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Hotels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
              Hotels
            </CardTitle>
            <CardDescription>
              Import your property/hotel data first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="hotel-upload">
              <input
                id="hotel-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('hotels', file);
                }}
                disabled={loading}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => document.getElementById('hotel-upload')?.click()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Hotels CSV
              </Button>
            </label>
          </CardContent>
        </Card>

        {/* Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
              Rooms
            </CardTitle>
            <CardDescription>
              Import room inventory (142 rooms)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="rooms-upload">
              <input
                id="rooms-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('rooms', file);
                }}
                disabled={loading}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => document.getElementById('rooms-upload')?.click()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Rooms CSV
              </Button>
            </label>
          </CardContent>
        </Card>

        {/* Reservations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
              Reservations
            </CardTitle>
            <CardDescription>
              Import bookings (12,863 records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="reservations-upload">
              <input
                id="reservations-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('reservations', file);
                }}
                disabled={loading}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => document.getElementById('reservations-upload')?.click()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Reservations CSV
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results && (
        <Card className={results.success ? 'border-green-500' : 'border-yellow-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{results.message}</p>
            {results.imported !== undefined && (
              <p className="text-sm text-muted-foreground">
                Successfully imported: {results.imported} records
              </p>
            )}
            {results.errors && results.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-sm mb-2">Errors:</p>
                <ul className="text-xs space-y-1 text-muted-foreground max-h-40 overflow-y-auto">
                  {results.errors.map((error: string, i: number) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-1">Hotels CSV columns:</p>
            <code className="text-xs">name, address, phone, email, description</code>
          </div>
          <div>
            <p className="font-medium mb-1">Rooms CSV columns:</p>
            <code className="text-xs">name, room_number, room_type, capacity, price, description, status</code>
          </div>
          <div>
            <p className="font-medium mb-1">Reservations CSV columns:</p>
            <code className="text-xs">guest_name, guest_phone, guest_email, room_number, check_in, check_out, total_amount, status</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportCSV;
