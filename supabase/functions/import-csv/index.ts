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

    // Verify user is super admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, csvData } = await req.json();
    console.log(`Super admin ${user.id} processing ${type} import`);

    let result: ImportResult;

    switch (type) {
      case 'hotels':
        result = await importHotels(supabase, csvData);
        break;
      case 'rooms':
        result = await importRooms(supabase, csvData);
        break;
      case 'reservations':
        result = await importReservations(supabase, csvData);
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

async function importReservations(supabase: any, csvData: any[]): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  // Get all hotels and rooms
  const { data: hotels } = await supabase.from('hotels').select('id, name');
  const { data: rooms } = await supabase.from('rooms').select('id, room_number, hotel_id');

  if (!hotels || hotels.length === 0) {
    return {
      success: false,
      message: 'No hotels found. Please import hotels first.',
      errors: ['No hotels in database']
    };
  }

  const hotelMap = new Map(hotels.map((h: any) => [h.name.toLowerCase(), h.id]));
  const roomMap = new Map(rooms?.map((r: any) => [`${r.hotel_id}_${r.room_number}`, r.id]) || []);
  const defaultHotelId = hotels.length === 1 ? hotels[0].id : null;

  // Import reservations in batches of 50
  for (let i = 0; i < csvData.length; i += 50) {
    const batch = csvData.slice(i, i + 50);
    
    for (const reservation of batch) {
      try {
        // Determine hotel
        let hotelId = defaultHotelId;
        if (reservation.hotel_name || reservation.property_name) {
          const hotelName = (reservation.hotel_name || reservation.property_name).toLowerCase();
          hotelId = hotelMap.get(hotelName) || defaultHotelId;
        }

        if (!hotelId) {
          errors.push(`Reservation has no matching hotel`);
          continue;
        }

        // Find or create guest
        const guestName = reservation.guest_name || reservation.name || 'Guest';
        const guestPhone = reservation.guest_phone || reservation.phone || `temp_${Date.now()}_${Math.random()}`;
        const guestEmail = reservation.guest_email || reservation.email || '';

        let guestId;
        if (guestPhone && !guestPhone.startsWith('temp_')) {
          const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('hotel_id', hotelId)
            .eq('phone', guestPhone)
            .single();

          if (existingGuest) {
            guestId = existingGuest.id;
          } else {
            const { data: newGuest, error: guestError } = await supabase
              .from('guests')
              .insert({
                hotel_id: hotelId,
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
          const { data: newGuest, error: guestError } = await supabase
            .from('guests')
            .insert({
              hotel_id: hotelId,
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

        // Find room
        const roomNumber = reservation.room_number || reservation.room;
        const roomId = roomMap.get(`${hotelId}_${roomNumber}`);

        if (!roomId) {
          errors.push(`Room ${roomNumber} not found for reservation`);
          continue;
        }

        // Create booking
        const { error: bookingError } = await supabase.from('bookings').insert({
          hotel_id: hotelId,
          room_id: roomId,
          guest_id: guestId,
          guest_name: guestName,
          guest_phone: guestPhone,
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

    console.log(`Processed batch ${Math.floor(i / 50) + 1}, imported: ${imported}`);
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? `Successfully imported ${imported} reservations` : 'Import completed with errors',
    imported,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined
  };
}
