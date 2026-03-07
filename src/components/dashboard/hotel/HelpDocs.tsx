import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  Calendar, 
  DoorOpen, 
  Users, 
  Link2, 
  Settings, 
  Bell, 
  CreditCard,
  Search,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Globe,
  Shield,
  BarChart3,
  MessageSquare,
  UserPlus
} from "lucide-react";

const HelpDocs = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const sections = [
    {
      id: "getting-started",
      icon: CheckCircle,
      title: "Getting Started",
      description: "Learn the basics of setting up your hotel",
      items: [
        {
          question: "How do I set up my hotel profile?",
          answer: `1. Go to **Settings** in the sidebar menu
2. Fill in your hotel details including name, address, contact information
3. Upload your hotel logo and photos
4. Add your hotel description and amenities
5. Set up your social media links (Google Business, Instagram, Facebook)
6. Click **Save Changes** to update your profile

Your hotel profile will appear on your public page that guests can view.`
        },
        {
          question: "How do I access my public hotel page?",
          answer: `Click the **Public Page** button in the top header of your dashboard. This opens your hotel's public-facing page where guests can view your rooms, amenities, and submit booking requests.

You can share this link with potential guests or add it to your website and social media profiles.`
        },
        {
          question: "What do the different dashboard sections do?",
          answer: `- **Overview**: Quick summary of your hotel's performance, recent bookings, and statistics
- **Calendar**: Visual timeline of all bookings across rooms
- **Bookings**: Manage all reservations (check-in, check-out, cancel)
- **Rooms**: Add, edit, and manage your hotel rooms
- **Guests**: View and manage guest information
- **Booking Requests**: Review and approve/reject new booking inquiries
- **Earnings**: Track your revenue and commission reports
- **Invoices**: View and pay platform invoices
- **Sync**: Connect external calendars (Booking.com, Airbnb, etc.)
- **Support**: Create and manage support tickets
- **Settings**: Update hotel profile and preferences`
        }
      ]
    },
    {
      id: "rooms",
      icon: DoorOpen,
      title: "Room Management",
      description: "Add and manage your hotel rooms",
      items: [
        {
          question: "How do I add a new room?",
          answer: `1. Go to **Rooms** in the sidebar
2. Click the **Add Room** button
3. Fill in the room details:
   - Room name (e.g., "Deluxe Suite 101")
   - Room number
   - Room type (Single, Double, Suite, etc.)
   - Capacity (maximum guests)
   - Price per night
   - Square meters
   - Description
   - Amenities (WiFi, TV, AC, etc.)
4. Upload room photos
5. Click **Save** to add the room

The room will now appear in your calendar and be available for bookings.`
        },
        {
          question: "How do I edit or delete a room?",
          answer: `To edit a room:
1. Go to **Rooms**
2. Find the room you want to edit
3. Click the **Edit** button (pencil icon)
4. Make your changes
5. Click **Save**

To delete a room:
1. Click the **Delete** button (trash icon) on the room card
2. Confirm the deletion

**Note**: You cannot delete a room that has active bookings.`
        },
        {
          question: "How do room statuses work?",
          answer: `Rooms have three status indicators:

- **Ready** (Green): Room is clean and prepared for the next guest
- **Dirty** (Orange): Room needs cleaning (automatically set after checkout)
- **Maintenance** (Red): Room is under maintenance and unavailable

You can change room status from the calendar view by clicking on a room and selecting a new status.`
        }
      ]
    },
    {
      id: "bookings",
      icon: BookOpen,
      title: "Booking Management",
      description: "Handle reservations and check-ins",
      items: [
        {
          question: "How do I create a new booking?",
          answer: `1. Go to **Calendar** or **Bookings**
2. Click **New Reservation** button
3. Select the room
4. Choose check-in and check-out dates
5. Enter guest information (name, email, phone)
6. Set the number of guests
7. Add any notes if needed
8. Click **Create Booking**

The booking will appear in your calendar and the guest will receive a confirmation email with their booking details.`
        },
        {
          question: "How do I check in a guest?",
          answer: `1. Go to **Bookings** or **Calendar**
2. Find the reservation
3. Click on it to open details
4. Click **Check In** button

The booking status will change from "Reserved" to "Checked In" and appear differently on your calendar.`
        },
        {
          question: "How do I check out a guest?",
          answer: `1. Go to **Bookings** or **Calendar**
2. Find the checked-in reservation
3. Click on it to open details
4. Click **Check Out** button

The room status will automatically change to "Dirty" to indicate it needs cleaning.`
        },
        {
          question: "How do I cancel a booking?",
          answer: `1. Find the booking in **Bookings** or **Calendar**
2. Click on it to open details
3. Click **Request Cancellation** button
4. Provide a reason for cancellation
5. Submit the request

The cancellation request will be reviewed and processed. The guest will be notified of the cancellation.`
        },
        {
          question: "What do the different booking statuses mean?",
          answer: `- **Pending**: Booking request received, awaiting confirmation
- **Reserved**: Booking confirmed, guest expected
- **Checked In**: Guest has arrived and checked in
- **Checked Out**: Guest has departed
- **Cancelled**: Booking was cancelled`
        }
      ]
    },
    {
      id: "booking-requests",
      icon: UserPlus,
      title: "Booking Requests",
      description: "Handle incoming booking inquiries",
      items: [
        {
          question: "What are booking requests?",
          answer: `Booking requests are inquiries from potential guests who want to book a room. They come from your public hotel page or integrated booking platforms.

Unlike direct bookings, requests need to be reviewed and approved before they become confirmed reservations.`
        },
        {
          question: "How do I approve a booking request?",
          answer: `1. Go to **Booking Requests** in the sidebar
2. Review the request details (dates, room, guest info)
3. Check availability for the requested dates
4. Click **Approve** to convert it to a booking
5. Select the room if not already specified
6. Confirm the booking

The guest will receive a confirmation email with their booking details.`
        },
        {
          question: "How do I reject a booking request?",
          answer: `1. Go to **Booking Requests**
2. Find the request you want to reject
3. Click **Reject**
4. Optionally provide a reason

The guest will be notified that their request was not approved.`
        }
      ]
    },
    {
      id: "calendar",
      icon: Calendar,
      title: "Calendar & Scheduling",
      description: "Visual booking management",
      items: [
        {
          question: "How do I use the calendar view?",
          answer: `The calendar shows all your bookings across rooms in a visual timeline:

- **Timeline View**: See bookings as horizontal bars across dates
- **Month View**: Traditional calendar grid showing bookings

Click on any booking to view details or make changes. Bookings are color-coded by status.

Use the navigation arrows to move between months or click "Today" to jump to the current date.`
        },
        {
          question: "How do I create a booking from the calendar?",
          answer: `1. Click the **New Reservation** button at the top of the calendar
2. Fill in the booking details
3. The booking will appear on the calendar immediately after creation`
        },
        {
          question: "What do the colors mean on the calendar?",
          answer: `Booking colors indicate status:
- **Blue**: Reserved/Pending
- **Green**: Checked In
- **Gray**: Checked Out
- **Red**: Cancelled

Room status indicators:
- **Green dot**: Room Ready
- **Orange dot**: Room Dirty
- **Red dot**: Room in Maintenance`
        }
      ]
    },
    {
      id: "sync",
      icon: Link2,
      title: "Calendar Sync (iCal)",
      description: "Connect external booking platforms",
      items: [
        {
          question: "What is iCal sync?",
          answer: `iCal sync allows you to connect external booking platforms like Booking.com, Airbnb, and Expedia to prevent double bookings.

When a booking is made on another platform, it automatically blocks those dates in your Wixotel calendar, and vice versa.`
        },
        {
          question: "How do I set up iCal sync?",
          answer: `1. Go to **Sync** in the sidebar
2. Select the room you want to sync
3. Click **Add iCal Feed**
4. Select the platform (Booking.com, Airbnb, etc.)
5. Paste the iCal URL from the external platform
6. Click **Save**

The sync will run automatically every few hours. You can also manually sync by clicking the refresh button.

**Finding your iCal URL:**
- **Booking.com**: Extranet → Calendar → Sync → Export calendar
- **Airbnb**: Calendar → Availability settings → Connect calendars → Export calendar`
        },
        {
          question: "How do I export my Wixotel calendar?",
          answer: `1. Go to **Sync**
2. Find the room you want to export
3. Copy the **Export URL** shown for that room
4. Paste this URL into your external platform's import calendar feature

This allows other platforms to see your Wixotel bookings and block those dates automatically.`
        },
        {
          question: "What if there's a booking conflict?",
          answer: `If the sync detects a conflict (same room booked on multiple platforms for the same dates), you'll see a notification in the **Conflicts** section at the top of the Sync page.

Review each conflict and decide which booking to keep. You may need to cancel one of the bookings manually on the other platform.`
        }
      ]
    },
    {
      id: "guests",
      icon: Users,
      title: "Guest Management",
      description: "Manage guest information",
      items: [
        {
          question: "How do I view guest history?",
          answer: `1. Go to **Guests** in the sidebar
2. You'll see a list of all guests who have stayed at your hotel
3. Click on a guest to view their booking history, contact details, and any notes

Use the search bar to find specific guests by name, email, or phone number.`
        },
        {
          question: "Can I add notes about guests?",
          answer: `Yes! When viewing or editing a booking, you can add notes in the "Notes" field. These notes are visible to your staff but not to the guest.

Common uses:
- Special requests (early check-in, extra pillows)
- Dietary requirements
- VIP status or loyalty notes
- Previous issues or preferences`
        }
      ]
    },
    {
      id: "earnings",
      icon: BarChart3,
      title: "Earnings & Reports",
      description: "Track revenue and performance",
      items: [
        {
          question: "How do I view my earnings?",
          answer: `Go to **Earnings** in the sidebar to see:

- Total revenue
- Number of bookings
- Average booking value
- Revenue breakdown by period

You can filter by date range to see specific periods.`
        },
        {
          question: "How is commission calculated?",
          answer: `The platform charges a commission on each booking based on your subscription plan. This is calculated as a percentage of the total booking value.

View your commission rate and detailed breakdown in the Earnings section.`
        }
      ]
    },
    {
      id: "invoices",
      icon: CreditCard,
      title: "Invoices & Payments",
      description: "Manage platform payments",
      items: [
        {
          question: "How do I view my invoices?",
          answer: `1. Go to **Invoices** in the sidebar
2. You'll see a list of all invoices
3. Click **Download PDF** to get a printable invoice

Invoices show your subscription fees and any commissions owed.`
        },
        {
          question: "How do I pay my invoice?",
          answer: `Each invoice includes payment instructions:

1. **Bank Transfer**: Use the bank details provided on the invoice
2. **PayPal**: Click the PayPal link or scan the QR code

Mark your payment with the invoice number as reference. Once received, your invoice status will be updated to "Paid".`
        }
      ]
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Notifications",
      description: "Stay updated on activities",
      items: [
        {
          question: "Where do I see notifications?",
          answer: `Click the **bell icon** in the top right of your dashboard. You'll see:

- New booking requests
- Booking confirmations
- Calendar sync alerts
- System announcements

Unread notifications show a red badge with the count.`
        },
        {
          question: "What types of notifications will I receive?",
          answer: `- **New Booking Request**: When a guest submits a booking inquiry
- **Booking Confirmed**: When a booking is confirmed
- **Guest Checked In/Out**: Status changes for bookings
- **Sync Conflict**: When calendar sync detects a double booking
- **Invoice Due**: When you have an outstanding invoice
- **System Updates**: Important platform announcements`
        }
      ]
    },
    {
      id: "support",
      icon: MessageSquare,
      title: "Getting Help",
      description: "Contact support team",
      items: [
        {
          question: "How do I contact support?",
          answer: `1. Go to **Support** in the sidebar
2. Click **New Ticket**
3. Describe your issue
4. Select priority level
5. Submit the ticket

Our team will respond within 24 hours. You can also reach us via WhatsApp at +35568204518.`
        },
        {
          question: "How do I check my support ticket status?",
          answer: `Go to **Support** to see all your tickets and their current status:

- **Open**: Awaiting response from support
- **In Progress**: Being worked on
- **Resolved**: Issue has been fixed
- **Closed**: Ticket completed`
        }
      ]
    },
    {
      id: "mobile",
      icon: Smartphone,
      title: "Mobile Access",
      description: "Using on mobile devices",
      items: [
        {
          question: "Can I use the dashboard on my phone?",
          answer: `Yes! The dashboard is fully responsive and works on all devices:

1. Open your browser on your phone
2. Go to the dashboard URL
3. Log in with your credentials
4. Use the menu icon to navigate between sections

For the best experience, we recommend using the latest version of Chrome or Safari.`
        }
      ]
    },
    {
      id: "security",
      icon: Shield,
      title: "Security & Privacy",
      description: "Keep your account safe",
      items: [
        {
          question: "How do I change my password?",
          answer: `1. Go to **Settings**
2. Find the password section
3. Enter your new password (minimum 8 characters, include uppercase and symbol)
4. Confirm the new password
5. Click **Update Password**

For security, you may be asked to re-authenticate.`
        },
        {
          question: "Is my data secure?",
          answer: `Yes! We take security seriously:

- All data is encrypted in transit and at rest
- We use industry-standard authentication
- Regular security audits
- GDPR compliant data handling
- Automatic session timeout for inactive users

Never share your login credentials with others.`
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help & Documentation</h1>
        <p className="text-muted-foreground">
          Learn how to set up and manage your hotel on Wixotel
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Start */}
      {!searchQuery && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>Complete these steps to get your hotel up and running</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: 1, title: "Set up profile", desc: "Add hotel details & photos" },
                { step: 2, title: "Add rooms", desc: "Create your room inventory" },
                { step: 3, title: "Connect calendars", desc: "Sync with Booking.com, Airbnb" },
                { step: 4, title: "Start accepting bookings", desc: "Go live!" }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <Badge variant="secondary" className="shrink-0">{item.step}</Badge>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation Sections */}
      <div className="grid gap-4">
        {filteredSections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, index) => (
                  <AccordionItem key={index} value={`${section.id}-${index}`}>
                    <AccordionTrigger className="text-left text-sm hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                        {item.answer.split('\n').map((line, i) => (
                          <p key={i} className="mb-2 last:mb-0 whitespace-pre-wrap">
                            {line.replace(/\*\*(.*?)\*\*/g, (_, text) => text)}
                          </p>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          </CardContent>
        </Card>
      )}

      {/* Contact Support */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold">Still need help?</h3>
              <p className="text-sm text-muted-foreground">Our support team is ready to assist you</p>
            </div>
            <div className="flex gap-2">
              <a 
                href="https://wa.me/447400754801" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
              >
                WhatsApp Support
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpDocs;
