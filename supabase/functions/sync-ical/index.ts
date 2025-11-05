import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
}

function parseICalDate(dateStr: string): string {
  // Handle both DATE and DATETIME formats
  // DATE format: 20250115
  // DATETIME format: 20250115T120000Z
  const cleanDate = dateStr.replace(/[^0-9]/g, '');
  const year = cleanDate.substring(0, 4);
  const month = cleanDate.substring(4, 6);
  const day = cleanDate.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function parseICalContent(icalContent: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalContent.split(/\r?\n/);
  
  let currentEvent: Partial<ICalEvent> | null = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (trimmedLine === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent as ICalEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).split(';')[0];
        const value = trimmedLine.substring(colonIndex + 1);
        
        switch (key) {
          case 'UID':
            currentEvent.uid = value;
            break;
          case 'SUMMARY':
            currentEvent.summary = value;
            break;
          case 'DTSTART':
            currentEvent.dtstart = parseICalDate(value);
            break;
          case 'DTEND':
            currentEvent.dtend = parseICalDate(value);
            break;
          case 'DESCRIPTION':
            currentEvent.description = value;
            break;
        }
      }
    }
  }
  
  return events;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feed_id, feed_url, room_id, hotel_id, platform } = await req.json();

    if (!feed_url || !room_id || !hotel_id) {
      return new Response(
        JSON.stringify({ error: 'feed_url, room_id, and hotel_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Syncing iCal feed for room ${room_id} from ${feed_url}`);

    // Get room details for notifications
    const { data: room } = await supabase
      .from('rooms')
      .select('name, room_number')
      .eq('id', room_id)
      .single();
    
    const roomName = room ? `${room.name} ${room.room_number ? `(${room.room_number})` : ''}` : 'Unknown Room';

    // Fetch the iCal feed
    const response = await fetch(feed_url, {
      headers: {
        'User-Agent': 'Wixotel-iCal-Sync/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal feed: ${response.statusText}`);
    }

    const icalContent = await response.text();
    const events = parseICalContent(icalContent);
    
    console.log(`Parsed ${events.length} events from iCal feed`);

    let bookingsCreated = 0;
    const conflicts: Array<{ dates: string; summary: string; event: ICalEvent; conflictingBookingId?: string }> = [];

    // Process each event
    for (const event of events) {
      try {
        // Check if booking already exists with this external UID
        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('room_id', room_id)
          .eq('notes', `iCal UID: ${event.uid}`)
          .single();

        if (existingBooking) {
          console.log(`Booking already exists for UID ${event.uid}, skipping`);
          continue;
        }

        // Check for date overlap with existing bookings
        const { data: overlappingBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('room_id', room_id)
          .neq('status', 'cancelled')
          .lte('check_in', event.dtend)
          .gte('check_out', event.dtstart);

        if (overlappingBookings && overlappingBookings.length > 0) {
          console.log(`Date overlap detected for event ${event.uid}, skipping`);
          conflicts.push({
            dates: `${event.dtstart} to ${event.dtend}`,
            summary: event.summary || 'External Booking',
            event: event,
            conflictingBookingId: overlappingBookings[0].id,
          });
          continue;
        }

        // Create a blocked booking
        const { error: insertError } = await supabase
          .from('bookings')
          .insert({
            hotel_id,
            room_id,
            check_in: event.dtstart,
            check_out: event.dtend,
            full_name: 'External Booking (Blocked)',
            guest_email: null,
            guest_phone: null,
            guest_count: 1,
            total_amount: 0,
            status: 'reserved',
            payment_status: 'paid',
            source: 'ical_sync',
            confirmation_number: `ICAL-${event.uid.substring(0, 8)}`,
            notes: `iCal UID: ${event.uid}\nSummary: ${event.summary}\n${event.description || ''}`,
          });

        if (insertError) {
          console.error(`Failed to create booking for event ${event.uid}:`, insertError);
        } else {
          bookingsCreated++;
          console.log(`Created booking for event ${event.uid}`);
        }
      } catch (eventError) {
        console.error(`Error processing event ${event.uid}:`, eventError);
      }
    }

    const duration = Date.now() - startTime;

    // Create conflict records and notifications
    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        // Create detailed conflict record
        const { data: conflictRecord, error: conflictError } = await supabase
          .from('ical_sync_conflicts')
          .insert({
            feed_id,
            hotel_id,
            room_id,
            platform: platform || 'External',
            external_check_in: conflict.event.dtstart,
            external_check_out: conflict.event.dtend,
            external_summary: conflict.event.summary || 'External Booking',
            external_uid: conflict.event.uid,
            external_description: conflict.event.description,
            conflicting_booking_id: conflict.conflictingBookingId,
            resolution_status: 'unresolved',
          })
          .select()
          .single();

        if (conflictError) {
          console.error('Error creating conflict record:', conflictError);
        } else {
          console.log('Created conflict record:', conflictRecord?.id);
        }
      }

      // Create single notification for all conflicts
      const conflictMessage = conflicts.length === 1
        ? `${platform || 'External'} booking (${conflicts[0].dates}) couldn't be imported for ${roomName} due to an existing reservation.`
        : `${conflicts.length} ${platform || 'External'} bookings couldn't be imported for ${roomName} due to overlapping reservations. First conflict: ${conflicts[0].dates}.`;

      await supabase
        .from('notifications')
        .insert({
          hotel_id,
          type: 'ical_conflict',
          title: 'Calendar Sync Conflict',
          message: conflictMessage,
          is_read: false,
        });
      
      console.log(`Created conflict notification for ${conflicts.length} overlapping booking(s)`);
    }

    // Update feed sync status
    if (feed_id) {
      await supabase
        .from('room_ical_feeds')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_status: 'success',
          sync_error: null,
        })
        .eq('id', feed_id);

      // Log sync operation
      await supabase
        .from('ical_sync_logs')
        .insert({
          feed_id,
          hotel_id,
          status: 'success',
          events_processed: events.length,
          bookings_created: bookingsCreated,
          sync_duration_ms: duration,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        events_processed: events.length,
        bookings_created: bookingsCreated,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing iCal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const { feed_id, hotel_id } = await req.json().catch(() => ({}));

    // Update feed with error if we have the ID
    if (feed_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('room_ical_feeds')
        .update({
          sync_status: 'error',
          sync_error: errorMessage,
        })
        .eq('id', feed_id);

      if (hotel_id) {
        await supabase
          .from('ical_sync_logs')
          .insert({
            feed_id,
            hotel_id,
            status: 'error',
            error_message: errorMessage,
            events_processed: 0,
            bookings_created: 0,
          });
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
