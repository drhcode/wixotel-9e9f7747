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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, csvData } = await req.json();
    console.log(`Processing ${type} import for user ${user.id}`);

    let result: ImportResult;

    switch (type) {
      case 'hotels':
        result = await importHotels(supabase, csvData, user.id);
        break;
      case 'rooms':
        result = await importRooms(supabase, csvData, user.id);
        break;
      case 'reservations':
        result = await importReservations(supabase, csvData, user.id);
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

async function importHotels(supabase: any, csvData: any[], userId: string): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // First, get or create hotel for this user
  const { data: existingHotel } = await supabase
    .from('hotels')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (existingHotel) {
    // Update existing hotel with first property data
    const property = csvData[0];
    const { error } = await supabase
      .from('hotels')
      .update({
        name: property.name || property.property_name || 'My Hotel',
        address: property.address || property.location || '',
        phone: property.phone || property.contact || '',
        email: property.email || '',
        description: property.description || '',
        status: 'active'
      })
      .eq('id', existingHotel.id);

    if (error) {
      errors.push(`Failed to update hotel: ${error.message}`);
    } else {
      imported = 1;
    }
  } else {
    // Create new hotel
    const property = csvData[0];
    const { error } = await supabase.from('hotels').insert({
      owner_id: userId,
      name: property.name || property.property_name || 'My Hotel',
      address: property.address || property.location || '',
      phone: property.phone || property.contact || '',
      email: property.email || '',
      description: property.description || '',
      status: 'active'
    });

    if (error) {
      errors.push(`Failed to create hotel: ${error.message}`);
    } else {
      imported = 1;
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? `Successfully imported ${imported} hotel` : 'Import completed with errors',
    imported,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function importRooms(supabase: any, csvData: any[], userId: string): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // Get user's hotel
  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (hotelError || !hotel) {
    return {
      success: false,
      message: 'No hotel found. Please import hotel first.',
      errors: ['Hotel not found']
    };
  }

  // Import rooms in batches of 50
  for (let i = 0; i < csvData.length; i += 50) {
    const batch = csvData.slice(i, i + 50);
    const roomsToInsert = batch.map(room => ({
      hotel_id: hotel.id,
      name: room.name || room.room_name || `Room ${room.room_number || i + 1}`,
      room_number: room.room_number || room.number || String(i + 1),
      room_type: room.room_type || room.type || 'standard',
      capacity: parseInt(room.capacity || room.max_guests || '2'),
      price: parseFloat(room.price || room.rate || '0'),
      description: room.description || '',
      status: room.status || 'ready',
      is_available: room.is_available !== 'false' && room.is_available !== '0'
    }));

    const { error } = await supabase.from('rooms').insert(roomsToInsert);
    
    if (error) {
      errors.push(`Batch ${Math.floor(i / 50) + 1} failed: ${error.message}`);
    } else {
      imported += roomsToInsert.length;
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? `Successfully imported ${imported} rooms` : 'Import completed with errors',
    imported,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function importReservations(supabase: any, csvData: any[], userId: string): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // Get user's hotel
  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (hotelError || !hotel) {
    return {
      success: false,
      message: 'No hotel found. Please import hotel first.',
      errors: ['Hotel not found']
    };
  }

  // Get all rooms for mapping
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number')
    .eq('hotel_id', hotel.id);

  const roomMap = new Map(rooms?.map((r: any) => [r.room_number, r.id]) || []);

  // Import reservations in batches of 100
  for (let i = 0; i < csvData.length; i += 100) {
    const batch = csvData.slice(i, i + 100);
    
    for (const reservation of batch) {
      try {
        // Find or create guest
        const guestName = reservation.guest_name || reservation.name || 'Guest';
        const guestPhone = reservation.guest_phone || reservation.phone || '';
        const guestEmail = reservation.guest_email || reservation.email || '';

        let guestId;
        if (guestPhone) {
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('hotel_id', hotel.id)
            .eq('phone', guestPhone)
            .single();

          if (existingGuest) {
            guestId = existingGuest.id;
          } else {
            const { data: newGuest, error: guestError } = await supabase
              .from('guests')
              .insert({
                hotel_id: hotel.id,
                name: guestName,
                phone: guestPhone,
                email: guestEmail
              })
              .select('id')
              .single();

            if (guestError) {
              errors.push(`Failed to create guest ${guestName}: ${guestError.message}`);
              continue;
            }
            guestId = newGuest.id;
          }
        } else {
          // Create guest without unique phone
          const { data: newGuest, error: guestError } = await supabase
            .from('guests')
            .insert({
              hotel_id: hotel.id,
              name: guestName,
              phone: `temp_${Date.now()}_${Math.random()}`,
              email: guestEmail
            })
            .select('id')
            .single();

          if (guestError) {
            errors.push(`Failed to create guest ${guestName}: ${guestError.message}`);
            continue;
          }
          guestId = newGuest.id;
        }

        // Find room
        const roomNumber = reservation.room_number || reservation.room;
        const roomId = roomMap.get(roomNumber);

        if (!roomId) {
          errors.push(`Room ${roomNumber} not found for reservation`);
          continue;
        }

        // Create booking
        const { error: bookingError } = await supabase.from('bookings').insert({
          hotel_id: hotel.id,
          room_id: roomId,
          guest_id: guestId,
          guest_name: guestName,
          guest_phone: guestPhone || `temp_${Date.now()}`,
          guest_email: guestEmail,
          check_in: reservation.check_in || reservation.checkin_date,
          check_out: reservation.check_out || reservation.checkout_date,
          total_amount: parseFloat(reservation.total_amount || reservation.total || '0'),
          status: reservation.status || 'confirmed',
          payment_status: reservation.payment_status || 'pending',
          notes: reservation.notes || ''
        });

        if (bookingError) {
          errors.push(`Failed to create booking: ${bookingError.message}`);
        } else {
          imported++;
        }
      } catch (err: any) {
        errors.push(`Reservation import error: ${err.message}`);
      }
    }

    console.log(`Processed batch ${Math.floor(i / 100) + 1}, imported: ${imported}`);
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? `Successfully imported ${imported} reservations` : 'Import completed with errors',
    imported,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit errors shown
  };
}
