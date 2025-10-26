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

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[+\d\s()-]{7,20}$/;
  return phoneRegex.test(phone);
};

const validatePrice = (price: number): boolean => {
  return price > 0 && price < 1000000;
};

const validateCapacity = (capacity: number): boolean => {
  return capacity >= 1 && capacity <= 100;
};

const validateDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100;
};

const sanitizeString = (str: string, maxLength: number = 500): string => {
  return str.trim().substring(0, maxLength);
};

const validateDateRange = (checkIn: string, checkOut: string): boolean => {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  return outDate > inDate;
};

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

    const { type, csvData, hotelId, strict = false } = await req.json();
    
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
        result = await importReservations(supabase, csvData, userHotelId, strict);
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
  const validatedHotels: any[] = [];

  // Validate each hotel
  csvData.forEach((hotel: any, index: number) => {
    const rowNum = index + 2;
    
    if (!hotel.name || hotel.name.trim().length === 0) {
      errors.push(`Row ${rowNum}: Hotel name is required`);
      return;
    }
    if (hotel.name.length > 100) {
      errors.push(`Row ${rowNum}: Hotel name too long (max 100 chars)`);
      return;
    }
    if (!hotel.address || hotel.address.trim().length === 0) {
      errors.push(`Row ${rowNum}: Hotel address is required`);
      return;
    }
    if (hotel.address.length > 500) {
      errors.push(`Row ${rowNum}: Address too long (max 500 chars)`);
      return;
    }
    if (hotel.email && !validateEmail(hotel.email)) {
      errors.push(`Row ${rowNum}: Invalid email format`);
      return;
    }
    if (hotel.phone && !validatePhone(hotel.phone)) {
      errors.push(`Row ${rowNum}: Invalid phone format`);
      return;
    }
    if (hotel.description && hotel.description.length > 2000) {
      errors.push(`Row ${rowNum}: Description too long (max 2000 chars)`);
      return;
    }

    const ownerEmail = hotel.owner_email || hotel.email || `hotel_${Date.now()}_${Math.random()}@temp.com`;

    validatedHotels.push({
      name: sanitizeString(hotel.name, 100),
      address: sanitizeString(hotel.address, 500),
      email: hotel.email ? sanitizeString(hotel.email, 255) : ownerEmail,
      phone: hotel.phone ? sanitizeString(hotel.phone, 20) : null,
      description: hotel.description ? sanitizeString(hotel.description, 2000) : null,
      status: 'active',
      subscription_plan: hotel.subscription_plan || 'basic',
      owner_id: '00000000-0000-0000-0000-000000000000'
    });
  });

  if (errors.length > 0) {
    return {
      success: false,
      message: 'Validation errors found',
      errors: errors.slice(0, 10)
    };
  }

  let imported = 0;
  // Import hotels in batches of 20
  for (let i = 0; i < validatedHotels.length; i += 20) {
    const batch = validatedHotels.slice(i, i + 20);
    
    const { error } = await supabase.from('hotels').insert(batch);
    if (error) {
      errors.push(`Batch ${Math.floor(i / 20) + 1} failed: ${error.message}`);
    } else {
      imported += batch.length;
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
  const roomsToInsert = [];
  
  for (let i = 0; i < csvData.length; i++) {
    const room = csvData[i];
    const rowNum = i + 2;
    let hotelId = defaultHotelId;
    
    // Try to match hotel by name if provided
    if (room.hotel_name || room.property_name) {
      const hotelName = (room.hotel_name || room.property_name).toLowerCase();
      hotelId = hotelMap.get(hotelName) || defaultHotelId;
    }

    if (!hotelId) {
      errors.push(`Row ${rowNum}: No matching hotel found`);
      continue;
    }

    // Validate room data
    if (!room.name || room.name.trim().length === 0) {
      errors.push(`Row ${rowNum}: Room name is required`);
      continue;
    }
    if (room.name.length > 100) {
      errors.push(`Row ${rowNum}: Room name too long (max 100 chars)`);
      continue;
    }
    
    const capacity = parseInt(room.capacity || room.max_guests || '2');
    if (!validateCapacity(capacity)) {
      errors.push(`Row ${rowNum}: Invalid capacity (must be 1-100)`);
      continue;
    }
    
    const price = parseFloat(room.price || room.rate || '0');
    if (!validatePrice(price)) {
      errors.push(`Row ${rowNum}: Invalid price (must be positive and < 1,000,000)`);
      continue;
    }

    if (room.description && room.description.length > 1000) {
      errors.push(`Row ${rowNum}: Description too long (max 1000 chars)`);
      continue;
    }

    roomsToInsert.push({
      hotel_id: hotelId,
      name: sanitizeString(room.name, 100),
      room_number: room.room_number || room.number ? sanitizeString(room.room_number || room.number, 20) : String(i + 1),
      room_type: room.room_type || room.type || 'standard',
      capacity: capacity,
      price: price,
      description: room.description ? sanitizeString(room.description, 1000) : null,
      status: room.status || 'ready',
      is_available: room.is_available !== 'false' && room.is_available !== '0'
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: 'Validation errors found',
      errors: errors.slice(0, 10)
    };
  }

  // Insert in batches
  for (let i = 0; i < roomsToInsert.length; i += 50) {
    const batch = roomsToInsert.slice(i, i + 50);
    
    const { error } = await supabase.from('rooms').insert(batch);
    if (error) {
      errors.push(`Batch ${Math.floor(i / 50) + 1} failed: ${error.message}`);
    } else {
      imported += batch.length;
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
    'paid': 'completed',
    'complete': 'completed',
    'completed': 'completed',
    'fully paid': 'completed',
    'full paid': 'completed',
    'partially paid': 'pending',
    'partial': 'pending',
    'unpaid': 'pending',
    'due': 'pending',
    'awaiting payment': 'pending',
    'pending': 'pending',
    'refunded': 'refunded',
    'refund': 'refunded',
    'failed': 'failed',
    'declined': 'failed',
    'canceled': 'refunded',
    'cancelled': 'refunded'
  };
  
  return statusMap[normalized] || 'pending';
}

async function importReservations(supabase: any, csvData: any[], userHotelId: string | null = null, strict: boolean = false): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // Log first row to debug CSV structure
  if (csvData.length > 0) {
    console.log('First CSV row sample:', JSON.stringify(csvData[0]));
    console.log('CSV headers detected:', Object.keys(csvData[0]));
  }

  // Strict header validation
  if (strict && csvData.length > 0) {
    const allowed = new Set([
      'full_name','guest_phone','guest_email','guest_country','guest_city','guest_address','guest_count','room_number','check_in','check_out','total_amount','status','payment_status','notes'
    ]);
    const required = ['full_name','room_number','check_in','check_out'];
    const headers = Object.keys(csvData[0] || {});
    const unknown = headers.filter((h) => !allowed.has(h));
    const missing = required.filter((r) => !headers.includes(r));
    if (unknown.length > 0 || missing.length > 0) {
      return {
        success: false,
        message: `Invalid CSV headers${missing.length ? ' - missing: ' + missing.join(', ') : ''}${unknown.length ? ' - unknown: ' + unknown.join(', ') : ''}`,
        errors: [
          missing.length ? `Missing required headers: ${missing.join(', ')}` : '',
          unknown.length ? `Unknown headers present: ${unknown.join(', ')}` : ''
        ].filter(Boolean) as string[]
      };
    }
  }

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
        
        // Clean and normalize all fields - try multiple possible field names
        const fullName = cleanValue(reservation.full_name) 
          || cleanValue(reservation['Full Name'])
          || cleanValue(reservation.fullname)
          || cleanValue(reservation['FullName']);
        
        if (!fullName) {
          errors.push(`Row ${rowNumber}: Missing full_name`);
          console.log(`Row ${rowNumber} full data:`, reservation);
          continue;
        }
        
        // Log every 10th row to help debug
        if (rowNumber % 10 === 0) {
          console.log(`Row ${rowNumber} - Guest: ${fullName}, Room: ${cleanValue(reservation.room_number)}`);
        }
        
        const guestPhone = cleanValue(reservation.guest_phone) 
          || cleanValue(reservation.phone) 
          || cleanValue(reservation.Phone)
          || cleanValue(reservation['Guest Phone'])
          || '';
        
        const guestEmail = cleanValue(reservation.guest_email) 
          || cleanValue(reservation.email) 
          || cleanValue(reservation.Email)
          || cleanValue(reservation['Guest Email'])
          || null;
        
        const guestCountry = cleanValue(reservation.guest_country) 
          || cleanValue(reservation.country) 
          || cleanValue(reservation.Country)
          || null;
        
        const guestCity = cleanValue(reservation.guest_city) 
          || cleanValue(reservation.city) 
          || cleanValue(reservation.City)
          || null;
        
        const guestAddress = cleanValue(reservation.guest_address) 
          || cleanValue(reservation.address) 
          || cleanValue(reservation.Address)
          || null;
        
        // Validate guest name
        if (!fullName || fullName.length === 0) {
          errors.push(`Row ${rowNumber}: Guest name is required`);
          continue;
        }
        if (fullName.length > 100) {
          errors.push(`Row ${rowNumber}: Guest name too long (max 100 chars)`);
          continue;
        }
        
        // Validate email if provided
        if (guestEmail && !validateEmail(guestEmail)) {
          errors.push(`Row ${rowNumber}: Invalid email format`);
          continue;
        }
        
        // Validate phone if provided
        if (guestPhone && !validatePhone(guestPhone)) {
          errors.push(`Row ${rowNumber}: Invalid phone format`);
          continue;
        }

        // Validate address length
        if (guestAddress && guestAddress.length > 500) {
          errors.push(`Row ${rowNumber}: Guest address too long (max 500 chars)`);
          continue;
        }

        const guestCount = parseInt(cleanValue(reservation.guest_count) 
          || cleanValue(reservation.guests) 
          || cleanValue(reservation['Guest Count'])
          || '1') || 1;

        if (guestCount < 1 || guestCount > 100) {
          errors.push(`Row ${rowNumber}: Invalid guest count (must be 1-100)`);
          continue;
        }

        // Extract room number - try multiple field names
        const roomNumber = cleanValue(reservation.room_number) 
          || cleanValue(reservation.room) 
          || cleanValue(reservation.room_name)
          || cleanValue(reservation.Room)
          || cleanValue(reservation['Room Number']);
        
        if (!roomNumber) {
          errors.push(`Row ${rowNumber}: Missing room_number - guest: ${fullName}`);
          console.log(`Row ${rowNumber} full data:`, reservation);
          continue;
        }

        // Find room using flexible matching
        const roomLower = roomNumber.toLowerCase().trim();
        let roomId = roomByNumberMap.get(`${reservationHotelId}_${roomLower}`);
        
        // Try extracting just numbers
        if (!roomId) {
          const numberMatch = roomNumber.match(/\d+/);
          if (numberMatch) {
            const extractedNumber = numberMatch[0];
            roomId = roomByNumberMap.get(`${reservationHotelId}_${extractedNumber}`);
          }
        }
        
        // Try by full name match
        if (!roomId) {
          roomId = roomByNameMap.get(`${reservationHotelId}_${roomLower}`);
        }
        
        // Try partial name match
        if (!roomId) {
          for (const [key, value] of roomByNameMap.entries()) {
            if (key.startsWith(`${reservationHotelId}_`)) {
              const roomName = key.substring(`${reservationHotelId}_`.length);
              if (roomName.includes(roomLower) || roomLower.includes(roomName)) {
                roomId = value;
                break;
              }
            }
          }
        }

        if (!roomId) {
          errors.push(`Row ${rowNumber}: Room "${roomNumber}" not found - guest: ${fullName}`);
          continue;
        }

        // Parse and validate dates
        const checkIn = cleanValue(reservation.check_in || reservation.checkin || reservation.arrival);
        const checkOut = cleanValue(reservation.check_out || reservation.checkout || reservation.departure);
        
        if (!checkIn || !checkOut) {
          errors.push(`Row ${rowNumber}: Check-in and check-out dates are required`);
          continue;
        }

        if (!validateDate(checkIn)) {
          errors.push(`Row ${rowNumber}: Invalid check-in date format`);
          continue;
        }
        if (!validateDate(checkOut)) {
          errors.push(`Row ${rowNumber}: Invalid check-out date format`);
          continue;
        }
        if (!validateDateRange(checkIn, checkOut)) {
          errors.push(`Row ${rowNumber}: Check-out must be after check-in`);
          continue;
        }

        // Validate total amount
        const totalAmount = parseFloat(cleanValue(reservation.total_amount || reservation.amount) || '0');
        if (totalAmount < 0 || totalAmount > 1000000) {
          errors.push(`Row ${rowNumber}: Invalid total amount (must be 0-1,000,000)`);
          continue;
        }

        // Validate notes length
        const notes = cleanValue(reservation.notes);
        if (notes && notes.length > 1000) {
          errors.push(`Row ${rowNumber}: Notes too long (max 1000 chars)`);
          continue;
        }

        // Find or create guest - match by both name AND phone to avoid false duplicates
        const finalGuestPhone = guestPhone || `temp_${Date.now()}_${Math.random()}`;
        
        let guestId;
        if (guestPhone && fullName) {
          // Try to find existing guest by both name and phone
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('hotel_id', reservationHotelId)
            .eq('name', sanitizeString(fullName, 100))
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
              name: sanitizeString(fullName, 100),
              phone: finalGuestPhone,
              email: guestEmail,
              country: guestCountry ? sanitizeString(guestCountry, 100) : null,
              city: guestCity ? sanitizeString(guestCity, 100) : null,
              address: guestAddress ? sanitizeString(guestAddress, 500) : null
            })
            .select('id')
            .single();

          if (guestError) {
            errors.push(`Row ${rowNumber}: Failed to create guest ${fullName}: ${guestError.message}`);
            continue;
          }
          guestId = newGuest.id;
        }

        const status = normalizeStatus(cleanValue(reservation.status) || cleanValue(reservation.Status) || '');
        const paymentStatus = normalizePaymentStatus(cleanValue(reservation.payment_status) || cleanValue(reservation.Payment) || '');

        // Create booking
        const { error: bookingError } = await supabase.from('bookings').insert({
          hotel_id: reservationHotelId,
          room_id: roomId,
          guest_id: guestId,
          full_name: sanitizeString(fullName, 100),
          guest_phone: finalGuestPhone,
          guest_email: guestEmail,
          guest_count: guestCount,
          check_in: checkIn,
          check_out: checkOut,
          total_amount: totalAmount,
          status: status,
          payment_status: paymentStatus,
          notes: notes ? sanitizeString(notes, 1000) : null
        });

        if (bookingError) {
          errors.push(`Row ${rowNumber}: Failed to create booking for ${fullName}: ${bookingError.message}`);
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
