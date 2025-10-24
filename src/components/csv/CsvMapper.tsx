import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type CanonicalField =
  | "guest_name"
  | "guest_phone"
  | "guest_email"
  | "guest_country"
  | "guest_city"
  | "guest_address"
  | "guest_count"
  | "room_number"
  | "check_in"
  | "check_out"
  | "total_amount"
  | "status"
  | "payment_status"
  | "notes";

const ALL_FIELDS: CanonicalField[] = [
  "guest_name",
  "guest_phone",
  "guest_email",
  "guest_country",
  "guest_city",
  "guest_address",
  "guest_count",
  "room_number",
  "check_in",
  "check_out",
  "total_amount",
  "status",
  "payment_status",
  "notes",
];

const REQUIRED_FIELDS: CanonicalField[] = [
  "guest_name",
  "room_number",
  "check_in",
  "check_out",
];

const ALIAS_SUGGESTIONS: Record<CanonicalField, string[]> = {
  guest_name: ["guest_name", "name", "Guest", "Guest Name"],
  guest_phone: ["guest_phone", "phone", "Guest Phone"],
  guest_email: ["guest_email", "email", "Guest Email"],
  guest_country: ["guest_country", "country", "Country"],
  guest_city: ["guest_city", "city", "City"],
  guest_address: ["guest_address", "address", "Address"],
  guest_count: ["guest_count", "guests", "Guest Count"],
  room_number: ["room_number", "room", "room_name", "Room", "Room Number"],
  check_in: ["check_in", "checkin_date", "checkin", "Check In", "Check-In"],
  check_out: ["check_out", "checkout_date", "checkout", "Check Out", "Check-Out"],
  total_amount: ["total_amount", "total", "amount", "Total", "Total Amount"],
  status: ["status", "Status", "Booking Status"],
  payment_status: ["payment_status", "Payment Status", "Payment"],
  notes: ["notes", "Notes"],
};

interface CsvMapperProps {
  open: boolean;
  headers: string[];
  previewRows: any[];
  onCancel: () => void;
  onConfirm: (mapping: Record<CanonicalField, string | null>) => void;
}

const CsvMapper: React.FC<CsvMapperProps> = ({ open, headers, previewRows, onCancel, onConfirm }) => {
  const [mapping, setMapping] = useState<Record<CanonicalField, string | null>>({
    guest_name: null,
    guest_phone: null,
    guest_email: null,
    guest_country: null,
    guest_city: null,
    guest_address: null,
    guest_count: null,
    room_number: null,
    check_in: null,
    check_out: null,
    total_amount: null,
    status: null,
    payment_status: null,
    notes: null,
  });

  // Auto-suggest based on aliases and available headers
  React.useEffect(() => {
    const initial: Record<CanonicalField, string | null> = { ...mapping };
    ALL_FIELDS.forEach((field) => {
      if (initial[field]) return;
      const aliases = ALIAS_SUGGESTIONS[field] || [];
      const found = headers.find((h) => aliases.map(a => a.toLowerCase()).includes(h.toLowerCase()));
      initial[field] = found || null;
    });
    setMapping(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers.join(",")]);

  const missingRequired = useMemo(() => {
    return REQUIRED_FIELDS.filter((f) => !mapping[f]);
  }, [mapping]);

  const duplicateSelections = useMemo(() => {
    const selected = Object.values(mapping).filter(Boolean) as string[];
    const dups = selected.filter((v, i, a) => a.indexOf(v) !== i);
    return Array.from(new Set(dups));
  }, [mapping]);

  const handleChange = (field: CanonicalField, value: string | null) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Map CSV Columns</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {ALL_FIELDS.map((field) => (
            <div key={field} className="space-y-2">
              <Label className="text-xs sm:text-sm">
                {field.replace(/_/g, " ")}
                {REQUIRED_FIELDS.includes(field) && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Select
                value={mapping[field] || "__none__"}
                onValueChange={(v) => handleChange(field, v === "__none__" ? null : v)}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={`${field}-${h}`} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {duplicateSelections.length > 0 && (
          <p className="text-xs sm:text-sm text-destructive">
            Duplicate mappings: {duplicateSelections.join(", ")}
          </p>
        )}
        {missingRequired.length > 0 && (
          <p className="text-xs sm:text-sm text-destructive">
            Missing required: {missingRequired.join(", ")}
          </p>
        )}

        <div className="mt-4 sm:mt-6">
          <Label className="mb-2 block text-sm">Preview (first 5 rows)</Label>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={`h-${h}`} className="text-xs whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.slice(0, 5).map((row, idx) => (
                  <TableRow key={`r-${idx}`}>
                    {headers.map((h) => (
                      <TableCell key={`c-${idx}-${h}`} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                        {String(row[h] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(mapping)}
            disabled={missingRequired.length > 0 || duplicateSelections.length > 0}
            className="w-full sm:w-auto"
          >
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { CsvMapper, ALL_FIELDS, REQUIRED_FIELDS };
