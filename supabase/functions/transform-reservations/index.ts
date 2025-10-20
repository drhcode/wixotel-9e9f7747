import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OldReservation {
  id: string;
  property_id: string;
  reservation_status: string;
  check_in_date: string;
  check_out_date: string;
  adults: string;
  kids: string;
  room_name: string;
  room_id: string;
  cost_per_night: string;
  total_nights: string;
  guest_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  email: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface NewReservation {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_country: string;
  guest_city: string;
  guest_address: string;
  room_number: string;
  check_in: string;
  check_out: string;
  total_amount: string;
  status: string;
  payment_status: string;
  notes: string;
}

function parseCSV(text: string): OldReservation[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  const data: OldReservation[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV values properly
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

function extractRoomNumber(roomName: string): string {
  // Try to extract room number from room name
  const match = roomName.match(/\d{3}/); // Look for 3-digit numbers like 201, 301, etc.
  if (match) return match[0];
  
  // If no 3-digit number, try to extract any number
  const anyNumber = roomName.match(/\d+/);
  if (anyNumber) return anyNumber[0];
  
  // Return the room name as is if no number found
  return roomName;
}

function mapStatus(oldStatus: string): string {
  const statusMap: Record<string, string> = {
    'Checked Out': 'checked_out',
    'Cancelled': 'cancelled',
    'Confirmed': 'confirmed',
    'Pending': 'pending',
    'Checked In': 'checked_in'
  };
  
  return statusMap[oldStatus] || 'confirmed';
}

function mapPaymentStatus(reservationStatus: string): string {
  if (reservationStatus === 'Checked Out') return 'paid';
  if (reservationStatus === 'Cancelled') return 'pending';
  return 'pending';
}

function cleanValue(value: string): string {
  // Remove quotes and handle placeholder values
  const cleaned = value.replace(/['"]/g, '').trim();
  if (cleaned === '0' || cleaned === '1' || cleaned === 'NULL') return '';
  return cleaned;
}

function transformReservations(oldData: OldReservation[]): NewReservation[] {
  return oldData.map(old => {
    const firstName = cleanValue(old.first_name);
    const lastName = cleanValue(old.last_name);
    const guestName = [firstName, lastName].filter(n => n).join(' ') || 'Guest';
    
    const phone = cleanValue(old.phone);
    const email = cleanValue(old.email);
    const country = cleanValue(old.country) || 'Albania';
    const note = cleanValue(old.note);
    
    const costPerNight = parseFloat(old.cost_per_night) || 0;
    const totalNights = parseInt(old.total_nights) || 1;
    const totalAmount = (costPerNight * totalNights).toFixed(2);
    
    const roomNumber = extractRoomNumber(old.room_name);
    const status = mapStatus(old.reservation_status);
    const paymentStatus = mapPaymentStatus(old.reservation_status);

    return {
      guest_name: guestName,
      guest_phone: phone,
      guest_email: email,
      guest_country: country,
      guest_city: '',
      guest_address: '',
      room_number: roomNumber,
      check_in: old.check_in_date,
      check_out: old.check_out_date,
      total_amount: totalAmount,
      status: status,
      payment_status: paymentStatus,
      notes: note
    };
  });
}

function createCSV(data: NewReservation[]): string {
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

  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header as keyof NewReservation] || '';
      // Escape quotes and wrap in quotes if contains comma or quote
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvText } = await req.json();

    if (!csvText) {
      return new Response(
        JSON.stringify({ error: 'CSV text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Parsing CSV data...');
    const oldReservations = parseCSV(csvText);
    console.log(`Parsed ${oldReservations.length} reservations`);

    console.log('Transforming data...');
    const newReservations = transformReservations(oldReservations);
    console.log(`Transformed ${newReservations.length} reservations`);

    const newCsvText = createCSV(newReservations);

    return new Response(
      JSON.stringify({ 
        success: true, 
        csvText: newCsvText,
        recordCount: newReservations.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error transforming reservations:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to transform reservations',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});