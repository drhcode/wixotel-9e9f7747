# wixotel

Build a complete Hotel Reservation Manager SaaS web app using Next.js (React frontend), Supabase as backend/auth/database, and connect it to OpenAI GPT-5 for smart assistance.
Include two roles:
• Super Admin (platform owner)
• Hotel Admin (hotel manager)
🏗️ Core Requirements
• Authentication & Role System via Supabase Auth (Super Admin / Hotel Admin)
• Dashboard for each role with different views
• Clean, responsive UI using TailwindCSS and shadcn/ui
• Global state management with Zustand
• Use Supabase Row Level Security (RLS) to isolate each hotel’s data
👑 Super Admin Features
• View total hotels, bookings, and revenue in a global dashboard
• Approve/reject new hotel registrations
• Manage hotels (edit/suspend/delete)
• Manage subscription plans (Basic, Pro, Premium) and assign to hotels
• View analytics: total bookings, occupancy rates, revenue per hotel
• Platform settings (logo, currency, commission percentage)
🏨 Hotel Admin Features
• Manage hotel profile (name, address, description, photos, amenities)
• Manage rooms (add/edit/delete with name, price, capacity, amenities, images)
• Manage bookings (create, edit, cancel, mark check-in/check-out)
• Calendar view for room availability (use FullCalendar)
• Guest management (name, contact, ID, preferences)
• Payment tracking (cash, card, online)
• Revenue and occupancy reports (charts)
• Email notification templates (booking confirmation, payment confirmation)
• Staff subaccounts (optional, limited access)
💳 Payment Integration
• Integrate Stripe for hotel subscription payments
• Each hotel can pay monthly or yearly to activate their account
📈 Reports
• Super Admin: global revenue, occupancy trends
• Hotel Admin: revenue, bookings, occupancy by month
• Export reports as CSV/PDF
🧠 Smart Assistant
• Add GPT-5 assistant for hotel admins: 
• Suggest room pricing based on occupancy
• Generate quick email replies for guests
• Summarize monthly reports
⚙️ Tech Stack
• Next.js + TailwindCSS + shadcn/ui
• Supabase (Auth, DB, Storage)
• Zustand (state)
• Chart.js or Recharts (analytics)
• FullCalendar (calendar)
• Stripe (payments)
• Resend or Supabase email for notifications
🧩 Database Schema (suggested)
• users (id, role, email, password, name)
• hotels (id, name, address, description, owner_id, status, subscription_plan)
• rooms (id, hotel_id, name, price, capacity, amenities, images)
• bookings (id, room_id, guest_name, check_in, check_out, status, payment_status)
• guests (id, hotel_id, name, phone, email, id_number)
• payments (id, booking_id, method, amount, status, stripe_id)
• subscriptions (id, hotel_id, plan, start_date, end_date, status)
🧰 Additional
• Include landing page for new hotels to register (with approval workflow)
• Add multi-language (English default, future expansion ready)
• Add dark mode toggle
• Build fully modular and extendable — ready for adding “Staff” and “Guest” roles later

⚡ Final goal: a production-ready Hotel Reservation Manager SaaS app where Super Admin manages hotels, and each Hotel Admin manages rooms, bookings, guests, and payments — all from a modern dashboard UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wixotel.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/98240251-f1de-4a5b-810c-3c479753b712).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
