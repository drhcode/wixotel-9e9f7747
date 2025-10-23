import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  errors?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isSuperAdmin = roleData?.role === 'super_admin';
    const isHotelAdmin = roleData?.role === 'hotel_admin';

    if (!isSuperAdmin && !isHotelAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get hotel ID for hotel admins
    let userHotelId = null;
    if (isHotelAdmin) {
      const { data: hotelData } = await supabase
        .from('hotels')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (!hotelData) {
        return new Response(JSON.stringify({ error: 'No hotel found for user' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userHotelId = hotelData.id;
    }

    const { type, csvData, hotelId } = await req.json();
    
    // Hotel admins can only import for their own hotel
    if (isHotelAdmin && type === 'reservations') {
      if (!userHotelId) {
        return new Response(JSON.stringify({ error: 'No hotel found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (isHotelAdmin && (type === 'hotels' || type === 'rooms')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only super admins can import hotels and rooms' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User ${user.id} (${roleData?.role}) processing ${type} import`);

    let result: ImportResult;

    switch (type) {
      case 'hotels':
        result = await importHotels(supabase, csvData);
        break;
      case 'rooms':
        result = await importRooms(supabase, csvData);
        break;
      case 'reservations':
        result = await importReservations(supabase, csvData, userHotelId);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid import type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function importHotels(supabase: any, csvData: any[]): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // Import hotels in batches of 20
  for (let i = 0; i < csvData.length; i += 20) {
    const batch = csvData.slice(i, i + 20);
    
    for (const property of batch) {
      try {
        // Get or create owner user (you'll need to create auth users separately)
        const ownerEmail = property.owner_email || property.email || `hotel_${Date.now()}_${Math.random()}@temp.com`;
        
        // For now, create hotel without linking to owner (super admin can assign later)
        const { error } = await supabase.from('hotels').insert({
          name: property.name || property.property_name || 'Unnamed Hotel',
          address: property.address || property.location || '',
          phone: property.phone || property.contact || '',
          email: property.email || ownerEmail,
          description: property.description || '',
          status: 'active',
          subscription_plan: property.subscription_plan || 'basic',
          owner_id: '00000000-0000-0000-0000-000000000000' // Placeholder, update with actual user
        });

        if (error) {
          errors.push(`Failed to import hotel ${property.name}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (err: any) {
        errors.push(`Hotel import error: ${err.message}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? `Successfully imported ${imported} hotels` : 'Import completed with errors',
    imported,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined
  };
}

async function importRooms(supabase: any, csvData: any[]): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // Get all hotels to map room data
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name');

  if (!hotels || hotels.length === 0) {
    return {
      success: false,
      message: 'No hotels found. Please import hotels first.',
      errors: ['No hotels in database']
    };
  }

  // If CSV has hotel_name or property_name, try to match
  const hotelMap = new Map(hotels.map((h: any) => [h.name.toLowerCase(), h.id]));
  
  // If only one hotel, use it as default
  const defaultHotelId = hotels.length === 1 ? hotels[0].id : null;

  // Import rooms in batches of 50
  for (let i = 0; i < csvData.length; i += 50) {
    const batch = csvData.slice(i, i + 50);
    const roomsToInsert = [];

    for (const room of batch) {
      let hotelId = defaultHotelId;
      
      // Try to match hotel by name if provided
      if (room.hotel_name || room.property_name) {
        const hotelName = (room.hotel_name || room.property_name).toLowerCase();
        hotelId = hotelMap.get(hotelName) || defaultHotelId;
      }

      if (!hotelId) {
        errors.push(`Room ${room.name} has no matching hotel`);
        continue;
      }

      roomsToInsert.push({
        hotel_id: hotelId,
        name: room.name || room.room_name || `Room ${room.room_number || i + 1}`,
        room_number: room.room_number || room.number || String(i + 1),
        room_type: room.room_type || room.type || 'standard',
        capacity: parseInt(room.capacity || room.max_guests || '2'),
        price: parseFloat(room.price || room.rate || '0'),
        description: room.description || '',
        status: room.status || 'ready',
        is_available: room.is_available !== 'false' && room.is_available !== '0'
      });
    }

    if (roomsToInsert.length > 0) {
      const { error } = await supabase.from('rooms').insert(roomsToInsert);
      
      if (error) {
        errors.push(`Batch ${Math.floor(i / 50) + 1} failed: ${error.message}`);
      } else {
        imported += roomsToInsert.length;
      }
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? `Successfully imported ${imported} rooms` : 'Import completed with errors',
    imported,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined
  };
}

// Helper to clean and normalize values
function cleanValue(value: any): string {
  if (!value || value === '0' || value === 0 || value === 'null' || value === 'NULL') {
    return '';
  }
  return String(value).trim();
}

// Helper to normalize booking status
function normalizeStatus(status: string): string {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase().trim();
  
  // Map various formats to database enum values
  const statusMap: { [key: string]: string } = {
    'checked in': 'checked_in',
    'checked_in': 'checked_in',
    'checkedin': 'checked_in',
    'checked out': 'checked_out',
    'checked_out': 'checked_out',
    'checkedout': 'checked_out',
    'confirmed': 'reserved',
    'reserved': 'reserved',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'canceled': 'cancelled'
  };
  
  return statusMap[normalized] || 'pending';
}

// Helper to normalize payment status
function normalizePaymentStatus(status: string): string {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase().trim();
  
  const statusMap: { [key: string]: string } = {
    'paid': 'paid',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'refunded': 'refunded',
    'failed': 'failed'
  };
  
  return statusMap[normalized] || 'pending';
}

async function importReservations(supabase: any, csvData: any[], userHotelId: string | null = null): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // If userHotelId is provided, only import for that hotel (hotel admin)
  let hotelId: string;
  
  if (userHotelId) {
    hotelId = userHotelId;
  } else {
    // Super admin: get all hotels
    const { data: hotels } = await supabase.from('hotels').select('id, name');
    
    if (!hotels || hotels.length === 0) {
      return {
        success: false,
        message: 'No hotels found. Please import hotels first.',
        errors: ['No hotels in database']
      };
    }
    
    hotelId = hotels.length === 1 ? hotels[0].id : '';
  }

  // Get rooms for the hotel
  const roomQuery = supabase.from('rooms').select('id, name, room_number, hotel_id');
  if (userHotelId) {
    roomQuery.eq('hotel_id', userHotelId);
  }
  
  const { data: rooms } = await roomQuery;
  
  if (!rooms || rooms.length === 0) {
    return {
      success: false,
      message: 'No rooms found. Please create rooms first.',
      errors: ['No rooms in database for the hotel']
    };
  }
  
  // Create flexible matching maps
  const roomByNumberMap = new Map();
  const roomByNameMap = new Map();
  
  rooms.forEach((r: any) => {
    if (r.room_number) {
      const key = `${r.hotel_id}_${String(r.room_number).trim().toLowerCase()}`;
      roomByNumberMap.set(key, r.id);
    }
    
    if (r.name) {
      const nameKey = `${r.hotel_id}_${String(r.name).trim().toLowerCase()}`;
      roomByNameMap.set(nameKey, r.id);
    }
    
    // Extract number from name for flexible matching (e.g., "102" from "102 - Standard Double Room")
    if (r.name) {
      const numberMatch = String(r.name).match(/^\d+/);
      if (numberMatch) {
        const extractedNumber = numberMatch[0];
        const numberKey = `${r.hotel_id}_${extractedNumber}`;
        if (!roomByNumberMap.has(numberKey)) {
          roomByNumberMap.set(numberKey, r.id);
        }
      }
    }
  });

  console.log(`Found ${rooms.length} rooms for import`);

  // Import reservations in batches of 50
  for (let i = 0; i < csvData.length; i += 50) {
    const batch = csvData.slice(i, i + 50);
    
    for (let j = 0; j < batch.length; j++) {
      const reservation = batch[j];
      const rowNumber = i + j + 1;
      
      try {
        let reservationHotelId = hotelId;
        
        // Clean and normalize all fields
        const guestName = cleanValue(reservation.guest_name) || cleanValue(reservation.name) || 'Guest';
        const guestPhone = cleanValue(reservation.guest_phone) || cleanValue(reservation.phone) || '';
        const guestEmail = cleanValue(reservation.guest_email) || cleanValue(reservation.email) || null;
        const guestCountry = cleanValue(reservation.guest_country) || cleanValue(reservation.country) || null;
        const guestCity = cleanValue(reservation.guest_city) || cleanValue(reservation.city) || null;
        const guestAddress = cleanValue(reservation.guest_address) || cleanValue(reservation.address) || null;
        const guestCount = parseInt(cleanValue(reservation.guest_count) || '1') || 1;
        
        // Extract room number - try multiple field names
        const roomNumber = cleanValue(reservation.room_number) 
          || cleanValue(reservation.room) 
          || cleanValue(reservation.room_name)
          || cleanValue(reservation.Room);
        
        if (!roomNumber) {
          errors.push(`Row ${rowNumber}: Missing room_number - guest: ${guestName}`);
          continue;
        }

        // Find room using flexible matching
        let roomId = roomByNumberMap.get(`${reservationHotelId}_${roomNumber.toLowerCase()}`);
        
        // Try extracting just numbers (e.g., "102" from "Room 102" or "102 - Double")
        if (!roomId) {
          const numberMatch = roomNumber.match(/\d+/);
          if (numberMatch) {
            const extractedNumber = numberMatch[0];
            roomId = roomByNumberMap.get(`${reservationHotelId}_${extractedNumber}`);
          }
        }
        
        // Try by full name match
        if (!roomId) {
          roomId = roomByNameMap.get(`${reservationHotelId}_${roomNumber.toLowerCase()}`);
        }

        if (!roomId) {
          errors.push(`Row ${rowNumber}: Room "${roomNumber}" not found - guest: ${guestName}`);
          continue;
        }

        // Find or create guest - use temporary phone if none provided
        const finalGuestPhone = guestPhone || `temp_${Date.now()}_${Math.random()}`;
        
        let guestId;
        if (guestPhone) {
          // Try to find existing guest by phone
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('hotel_id', reservationHotelId)
            .eq('phone', guestPhone)
            .maybeSingle();

          if (existingGuest) {
            guestId = existingGuest.id;
          }
        }
        
        // Create new guest if not found
        if (!guestId) {
          const { data: newGuest, error: guestError } = await supabase
            .from('guests')
            .insert({
              hotel_id: reservationHotelId,
              name: guestName,
              phone: finalGuestPhone,
              email: guestEmail,
              country: guestCountry,
              city: guestCity,
              address: guestAddress
            })
            .select('id')
            .single();

          if (guestError) {
            errors.push(`Row ${rowNumber}: Failed to create guest ${guestName}: ${guestError.message}`);
            continue;
          }
          guestId = newGuest.id;
        }

        // Parse dates and amounts
        const checkIn = cleanValue(reservation.check_in) || cleanValue(reservation.checkin_date) || cleanValue(reservation.checkin);
        const checkOut = cleanValue(reservation.check_out) || cleanValue(reservation.checkout_date) || cleanValue(reservation.checkout);
        const totalAmount = parseFloat(cleanValue(reservation.total_amount) || cleanValue(reservation.total) || cleanValue(reservation.amount) || '0');
        const status = normalizeStatus(cleanValue(reservation.status));
        const paymentStatus = normalizePaymentStatus(cleanValue(reservation.payment_status));
        const notes = cleanValue(reservation.notes) || null;

        if (!checkIn || !checkOut) {
          errors.push(`Row ${rowNumber}: Missing check_in or check_out dates - guest: ${guestName}`);
          continue;
        }

        // Create booking
        const { error: bookingError } = await supabase.from('bookings').insert({
          hotel_id: reservationHotelId,
          room_id: roomId,
          guest_id: guestId,
          guest_name: guestName,
          guest_phone: finalGuestPhone,
          guest_email: guestEmail,
          guest_count: guestCount,
          check_in: checkIn,
          check_out: checkOut,
          total_amount: totalAmount,
          status: status,
          payment_status: paymentStatus,
          notes: notes
        });

        if (bookingError) {
          errors.push(`Row ${rowNumber}: Failed to create booking for ${guestName}: ${bookingError.message}`);
        } else {
          imported++;
        }
      } catch (err: any) {
        errors.push(`Row ${rowNumber}: Reservation import error: ${err.message}`);
      }
    }

    console.log(`Processed batch ${Math.floor(i / 50) + 1}, imported: ${imported}`);
  }

  console.log(`Import complete. Total imported: ${imported} out of ${csvData.length}`);
  if (errors.length > 0) {
    console.log(`Total errors: ${errors.length}`);
    errors.slice(0, 20).forEach(error => console.log(error));
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? `Successfully imported ${imported} reservations` : `Imported ${imported} out of ${csvData.length} rows`,
    imported,
    errors: errors.length > 0 ? errors : undefined
  };
}
