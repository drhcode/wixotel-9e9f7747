import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, Loader2 } from "lucide-react";

const TransformReservationsCSV = () => {
  const [processing, setProcessing] = useState(false);
  const [transformedCSV, setTransformedCSV] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    setTransformedCSV(null);

    try {
      const text = await file.text();
      
      toast.info("Transforming your CSV file...");

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('transform-reservations', {
        body: { csvText: text },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setTransformedCSV(data.csvText);
        toast.success(`Transformed ${data.recordCount} reservations successfully!`);
      } else {
        toast.error(data.error || "Failed to transform CSV");
      }
    } catch (error: any) {
      console.error('Transform error:', error);
      toast.error(error.message || "Failed to transform CSV file");
    } finally {
      setProcessing(false);
    }
  };

  const downloadTransformedCSV = () => {
    if (!transformedCSV) return;

    const blob = new Blob([transformedCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'vila_lordev_reservations_transformed.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Transformed CSV downloaded!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transform Old Reservation CSV</CardTitle>
        <CardDescription>
          Convert your old reservation format to the new import format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upload your old CSV file with columns: id, property_id, reservation_status, check_in_date, 
            check_out_date, room_name, first_name, last_name, phone, country, etc.
          </p>
          <p className="text-sm font-medium text-primary">
            It will be converted to: guest_name, guest_phone, guest_email, room_number, check_in, 
            check_out, total_amount, status, payment_status, notes
          </p>
        </div>

        <div className="flex gap-2">
          <label htmlFor="old-csv-upload" className="flex-1">
            <input
              id="old-csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              disabled={processing}
            />
            <Button
              variant="outline"
              disabled={processing}
              onClick={() => document.getElementById('old-csv-upload')?.click()}
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Old CSV
                </>
              )}
            </Button>
          </label>

          {transformedCSV && (
            <Button
              onClick={downloadTransformedCSV}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Transformed CSV
            </Button>
          )}
        </div>

        {transformedCSV && (
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary mb-2">✅ Transformation Complete!</p>
            <p className="text-xs text-muted-foreground">
              Download the transformed CSV and import it using the "Import CSV" button above.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransformReservationsCSV;