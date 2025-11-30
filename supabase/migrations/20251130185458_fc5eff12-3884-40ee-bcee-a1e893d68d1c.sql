-- Create comprehensive translation keys for the entire platform

-- Navigation & Header keys
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'header.home',
  'Home',
  'Navigation link to home page'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'header.home');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'header.find_booking',
  'Find My Booking',
  'Button to search for booking'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'header.find_booking');

-- Landing Page keys
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'hero.badge',
  'AI-Powered Hotel Management',
  'Badge text in hero section'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hero.badge');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'hero.title_elevate',
  'Elevate',
  'First word of hero title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hero.title_elevate');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'hero.title_rest',
  'Your Hotel Experience',
  'Rest of hero title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hero.title_rest');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'hero.description',
  'The ultimate platform for modern hospitality. Seamlessly manage rooms, bookings, guests, and revenue with intelligent automation.',
  'Hero section description'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hero.description');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'hero.fast_secure',
  'Fast & Secure Booking',
  'Feature highlight badge'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hero.fast_secure');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'hero.real_time',
  'Real-time Updates',
  'Feature highlight badge'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hero.real_time');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'hero.ai_powered',
  'AI-Powered Insights',
  'Feature highlight badge'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hero.ai_powered');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'cta.get_started',
  'Get Started Free',
  'Call to action button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'cta.get_started');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'cta.view_demo',
  'View Demo',
  'View demo button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'cta.view_demo');

-- Features section
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.title',
  'Everything You Need',
  'Features section title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.title');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.subtitle',
  'Comprehensive tools to run your hotel efficiently',
  'Features section subtitle'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.subtitle');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.hotel_management',
  'Hotel Management',
  'Feature title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.hotel_management');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.hotel_management_desc',
  'Manage multiple properties, rooms, and amenities from one central dashboard',
  'Feature description'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.hotel_management_desc');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.smart_booking',
  'Smart Booking',
  'Feature title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.smart_booking');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.smart_booking_desc',
  'Advanced calendar system with real-time availability and instant confirmations',
  'Feature description'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.smart_booking_desc');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.guest_management',
  'Guest Management',
  'Feature title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.guest_management');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.guest_management_desc',
  'Track guest preferences, history, and provide personalized experiences',
  'Feature description'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.guest_management_desc');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.analytics',
  'Analytics & Reports',
  'Feature title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.analytics');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.analytics_desc',
  'Comprehensive insights into occupancy rates, revenue, and performance metrics',
  'Feature description'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.analytics_desc');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.secure',
  'Secure & Reliable',
  'Feature title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.secure');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.secure_desc',
  'Enterprise-grade security with role-based access control and data protection',
  'Feature description'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.secure_desc');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.ai_powered',
  'AI-Powered',
  'Feature title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.ai_powered');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'landing'),
  'features.ai_powered_desc',
  'Smart pricing suggestions and automated guest communication with GPT-5',
  'Feature description'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'features.ai_powered_desc');

-- Hotels page
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.discover',
  'DISCOVER HOTELS',
  'Hotels page badge'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.discover');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.title',
  'Find Your Perfect Stay',
  'Hotels page title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.title');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.subtitle',
  'Explore {count} premium hotels powered by Wixotel',
  'Hotels page subtitle with count placeholder'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.subtitle');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.search_placeholder',
  'Search by hotel name, city, or country...',
  'Search input placeholder'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.search_placeholder');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.all_countries',
  'All Countries',
  'Filter dropdown option'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.all_countries');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.all_cities',
  'All Cities',
  'Filter dropdown option'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.all_cities');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.near_me',
  'Near Me',
  'Location filter button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.near_me');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.clear_filters',
  'Clear Filters',
  'Clear filters button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.clear_filters');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.showing',
  'Showing {start}-{end} of {total} hotels',
  'Results count text'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.showing');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.featured',
  'Featured',
  'Featured hotel badge'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.featured');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.verified',
  'Verified',
  'Verified hotel badge'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.verified');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.reviews',
  '{count} reviews',
  'Review count text'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.reviews');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'hotels.view_details',
  'View Details',
  'View hotel button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'hotels.view_details');

-- Auth page
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'back_home',
  'Back to home',
  'Back to home link'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'back_home');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'welcome_back',
  'Welcome Back',
  'Login page title'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'welcome_back');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'signin_subtitle',
  'Sign in to access your hotel management dashboard',
  'Login page subtitle'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'signin_subtitle');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'email_label',
  'Email Address',
  'Email input label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'email_label');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'email_placeholder',
  'your@email.com',
  'Email input placeholder'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'email_placeholder');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'password_label',
  'Password',
  'Password input label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'password_label');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'signin_button',
  'Sign In to Dashboard',
  'Login button text'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'signin_button');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'auth'),
  'signing_in',
  'Signing in...',
  'Login loading text'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'signing_in');

-- Dashboard common keys
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.overview',
  'Overview',
  'Dashboard overview tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.overview');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.bookings',
  'Bookings',
  'Bookings tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.bookings');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.calendar',
  'Calendar',
  'Calendar tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.calendar');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.rooms',
  'Rooms',
  'Rooms tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.rooms');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.guests',
  'Guests',
  'Guests tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.guests');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.leads',
  'Leads',
  'Leads tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.leads');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.earnings',
  'Earnings',
  'Earnings tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.earnings');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.invoices',
  'Invoices',
  'Invoices tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.invoices');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.ical',
  'iCal Sync',
  'iCal sync tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.ical');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.support',
  'Support',
  'Support tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.support');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'dashboard.settings',
  'Settings',
  'Settings tab'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'dashboard.settings');

-- Common UI elements
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.search',
  'Search',
  'Search button/label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.search');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.filter',
  'Filter',
  'Filter button/label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.filter');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.add',
  'Add',
  'Add button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.add');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.create',
  'Create',
  'Create button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.create');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.update',
  'Update',
  'Update button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.update');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.submit',
  'Submit',
  'Submit button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.submit');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.close',
  'Close',
  'Close button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.close');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.view',
  'View',
  'View button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.view');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.download',
  'Download',
  'Download button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.download');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.upload',
  'Upload',
  'Upload button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.upload');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.export',
  'Export',
  'Export button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.export');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.import',
  'Import',
  'Import button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.import');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.confirm',
  'Confirm',
  'Confirm button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.confirm');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.yes',
  'Yes',
  'Yes button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.yes');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.no',
  'No',
  'No button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.no');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.actions',
  'Actions',
  'Actions column header'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.actions');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.status',
  'Status',
  'Status label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.status');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.date',
  'Date',
  'Date label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.date');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.name',
  'Name',
  'Name label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.name');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.email',
  'Email',
  'Email label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.email');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.phone',
  'Phone',
  'Phone label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.phone');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.address',
  'Address',
  'Address label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.address');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.description',
  'Description',
  'Description label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.description');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.notes',
  'Notes',
  'Notes label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.notes');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.total',
  'Total',
  'Total label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.total');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'common.price',
  'Price',
  'Price label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'common.price');

-- Booking related keys
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'booking.check_in',
  'Check-in',
  'Check-in label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'booking.check_in');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'booking.check_out',
  'Check-out',
  'Check-out label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'booking.check_out');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'booking.guests',
  'Guests',
  'Guests label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'booking.guests');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'booking.room',
  'Room',
  'Room label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'booking.room');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'booking.confirmation_number',
  'Confirmation Number',
  'Confirmation number label'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'booking.confirmation_number');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'booking.new',
  'New Booking',
  'New booking button'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'booking.new');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'status.pending',
  'Pending',
  'Pending status'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'status.pending');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'status.confirmed',
  'Confirmed',
  'Confirmed status'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'status.confirmed');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'status.checked_in',
  'Checked In',
  'Checked in status'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'status.checked_in');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'status.checked_out',
  'Checked Out',
  'Checked out status'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'status.checked_out');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'status.cancelled',
  'Cancelled',
  'Cancelled status'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'status.cancelled');

-- Rating labels
INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'rating.exceptional',
  'Exceptional',
  'Rating label for 4.8+'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'rating.exceptional');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'rating.wonderful',
  'Wonderful',
  'Rating label for 4.5+'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'rating.wonderful');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'rating.amazing',
  'Amazing',
  'Rating label for 4.0+'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'rating.amazing');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'rating.great',
  'Great',
  'Rating label for 3.5+'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'rating.great');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'rating.good',
  'Good',
  'Rating label for 3.0+'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'rating.good');

INSERT INTO translation_keys (namespace_id, key, default_value, description)
SELECT 
  (SELECT id FROM translation_namespaces WHERE code = 'ui'),
  'rating.comfortable',
  'Comfortable',
  'Rating label for below 3.0'
WHERE NOT EXISTS (SELECT 1 FROM translation_keys WHERE key = 'rating.comfortable');