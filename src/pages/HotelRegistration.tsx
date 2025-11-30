import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Plus, Trash2, Building2, UserPlus, Calendar, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import demoCalendar from "@/assets/demo-calendar.jpg";
import demoBookings from "@/assets/demo-bookings.jpg";
import demoMobile from "@/assets/demo-mobile.jpg";
import { useRecaptcha } from "@/hooks/useRecaptcha";

const hotelSchema = z.object({
  name: z.string().trim().min(2, "Min 2 characters").max(100),
  address: z.string().trim().min(5, "Min 5 characters").max(500),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(7, "Invalid phone number"),
  email: z.string().trim().email("Invalid email").max(255),
  description: z.string().trim().max(1000).optional(),
  about_us: z.string().trim().max(2000).optional(),
});

const roomSchema = z.object({
  name: z.string().trim().min(1, "Room name required").max(100),
  price: z.number().min(0, "Price must be positive"),
  capacity: z.number().min(1, "Capacity must be at least 1").max(20),
});

const accountSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface Room {
  name: string;
  price: number;
  capacity: number;
}

const HotelRegistration = () => {
  const navigate = useNavigate();
  const { executeRecaptcha } = useRecaptcha();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [hotelData, setHotelData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    description: "",
    about_us: "",
  });

  const [rooms, setRooms] = useState<Room[]>([
    { name: "", price: 0, capacity: 2 }
  ]);

  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  const [defaultCountry, setDefaultCountry] = useState<any>("US");

  const [acceptedContract, setAcceptedContract] = useState(false);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Auto-detect country from IP
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(response => response.json())
      .then(data => {
        if (data.country_name) {
          setDefaultCountry(data.country_code);
          setHotelData(prev => ({ ...prev, country: data.country_name }));
        }
      })
      .catch(() => {
        // Silently fail, keep default
      });
  }, []);

  const addRoom = () => {
    setRooms([...rooms, { name: "", price: 0, capacity: 2 }]);
  };

  const removeRoom = (index: number) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((_, i) => i !== index));
    }
  };

  const updateRoom = (index: number, field: keyof Room, value: string | number) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setRooms(newRooms);
  };

  const handleNext = () => {
    if (step === 1) {
      const validation = hotelSchema.safeParse(hotelData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    if (step === 2) {
      for (let i = 0; i < rooms.length; i++) {
        const validation = roomSchema.safeParse(rooms[i]);
        if (!validation.success) {
          toast.error(`Room ${i + 1}: ${validation.error.errors[0].message}`);
          return;
        }
      }
    }

    if (step === 3) {
      const validation = accountSchema.safeParse(accountData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
    }

    if (step === 4 && !acceptedContract) {
      toast.error("Please accept the terms and conditions to continue");
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Validate all data
      const hotelValidation = hotelSchema.safeParse(hotelData);
      if (!hotelValidation.success) {
        toast.error(hotelValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      for (let room of rooms) {
        const roomValidation = roomSchema.safeParse(room);
        if (!roomValidation.success) {
          toast.error(`Room error: ${roomValidation.error.errors[0].message}`);
          setLoading(false);
          return;
        }
      }

      const accountValidation = accountSchema.safeParse(accountData);
      if (!accountValidation.success) {
        toast.error(accountValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Execute reCAPTCHA
      let recaptchaToken: string;
      try {
        recaptchaToken = await executeRecaptcha('hotel_registration');
      } catch (error) {
        console.error('reCAPTCHA error:', error);
        toast.error('Security verification failed. Please refresh and try again.');
        setLoading(false);
        return;
      }

      // Verify reCAPTCHA token
      const { data: recaptchaResult, error: recaptchaError } = await supabase.functions.invoke('verify-recaptcha', {
        body: { token: recaptchaToken, action: 'hotel_registration' }
      });

      if (recaptchaError || !recaptchaResult?.passed) {
        console.error('reCAPTCHA verification failed:', recaptchaResult);
        toast.error('Security verification failed. Please try again.');
        setLoading(false);
        return;
      }

      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: accountValidation.data.email,
        password: accountValidation.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Get basic plan
      const { data: basicPlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Basic')
        .single();

      // Check referral code if provided
      let referralId = null;
      if (accountData.referralCode) {
        const { data: referral } = await supabase
          .from('referrals')
          .select('id, is_active')
          .eq('referral_code', accountData.referralCode)
          .single();

        if (referral && referral.is_active) {
          referralId = referral.id;
        } else if (accountData.referralCode) {
          toast.warning('Referral code not found or inactive. Continuing without referral.');
        }
      }

      // Create hotel
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .insert({
          owner_id: authData.user.id,
          name: hotelValidation.data.name,
          address: hotelValidation.data.address,
          city: hotelValidation.data.city,
          country: hotelValidation.data.country,
          phone: hotelValidation.data.phone,
          email: hotelValidation.data.email,
          description: hotelValidation.data.description || null,
          about_us: hotelValidation.data.about_us || null,
          status: 'pending',
          plan_id: basicPlan?.id,
          referred_by: referralId,
        })
        .select()
        .single();

      if (hotelError) throw hotelError;

      // Create rooms
      const roomsData = rooms.map(room => ({
        hotel_id: hotel.id,
        name: room.name,
        price: room.price,
        capacity: room.capacity,
        is_available: true,
      }));

      const { error: roomsError } = await supabase
        .from('rooms')
        .insert(roomsData);

      if (roomsError) throw roomsError;

      // Send registration confirmation email with contract
      try {
        await supabase.functions.invoke('send-registration-confirmation', {
          body: {
            hotel: {
              name: hotelValidation.data.name,
              address: hotelValidation.data.address,
              city: hotelValidation.data.city,
              country: hotelValidation.data.country,
              phone: hotelValidation.data.phone,
              email: hotelValidation.data.email,
            },
            rooms: rooms,
            accountEmail: accountValidation.data.email,
          }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the registration if email fails
      }

      // Sign out user (they can't login until approved)
      await supabase.auth.signOut();

      navigate("/registration-success");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register hotel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="w-full max-w-7xl mx-auto relative z-10 animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-sm text-muted-foreground hover:text-primary transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Registration Form */}
          <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
            
            <CardHeader className="space-y-3 pb-6 pt-8">
              <CardTitle className="text-3xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
                Register Your Hotel
              </CardTitle>
              <CardDescription className="text-center text-base">
                Step {step} of {totalSteps}
              </CardDescription>
              <Progress value={progress} className="h-2" />
            </CardHeader>

            <CardContent className="pb-8">
            {/* Step 1: Hotel Information */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  Hotel Information
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Hotel Name *</Label>
                    <Input
                      id="name"
                      placeholder="Grand Hotel"
                      value={hotelData.name}
                      onChange={(e) => setHotelData({ ...hotelData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@hotel.com"
                      value={hotelData.email}
                      onChange={(e) => setHotelData({ ...hotelData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <PhoneInput
                      international
                      defaultCountry={defaultCountry}
                      value={hotelData.phone}
                      onChange={(value) => setHotelData({ ...hotelData, phone: value || "" })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <PlaceAutocomplete
                      value={hotelData.country}
                      onChange={(value) => setHotelData({ ...hotelData, country: value })}
                      onSelectPlace={(data) => {
                        setHotelData({ ...hotelData, country: data.name });
                      }}
                      placeholder="Start typing a country..."
                      type="country"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <PlaceAutocomplete
                      value={hotelData.city}
                      onChange={(value) => setHotelData({ ...hotelData, city: value })}
                      onSelectPlace={(data) => {
                        setHotelData({ ...hotelData, city: data.name });
                      }}
                      placeholder="Start typing a city..."
                      type="city"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address *</Label>
                  <AddressAutocomplete
                    value={hotelData.address}
                    onChange={(value) => setHotelData({ ...hotelData, address: value })}
                    onSelectAddress={(data) => {
                      setHotelData({
                        ...hotelData,
                        address: data.address,
                        city: data.city,
                        country: data.country,
                      });
                    }}
                    placeholder="Start typing your address..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Start typing to see suggestions with street names
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your hotel..."
                    value={hotelData.description}
                    onChange={(e) => setHotelData({ ...hotelData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about_us">About Us</Label>
                  <Textarea
                    id="about_us"
                    placeholder="Tell us more about your hotel..."
                    value={hotelData.about_us}
                    onChange={(e) => setHotelData({ ...hotelData, about_us: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Rooms */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Building2 className="h-5 w-5 text-primary" />
                    Room Information
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRoom}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Room
                  </Button>
                </div>

                <div className="space-y-4">
                  {rooms.map((room, index) => (
                    <Card key={index} className="p-4 bg-accent/20">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Room {index + 1}</h4>
                        {rooms.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRoom(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Room Name *</Label>
                          <Input
                            placeholder="Deluxe Suite"
                            value={room.name}
                            onChange={(e) => updateRoom(index, 'name', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Price per Night (€) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="100"
                            value={room.price || ""}
                            onChange={(e) => updateRoom(index, 'price', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Guest Capacity *</Label>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            placeholder="2"
                            value={room.capacity || ""}
                            onChange={(e) => updateRoom(index, 'capacity', parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Create Account */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Create Account
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-email">Email *</Label>
                    <Input
                      id="account-email"
                      type="email"
                      placeholder="your@email.com"
                      value={accountData.email}
                      onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password (min 6 characters)"
                      value={accountData.password}
                      onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                      required
                    />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral-code">Referral Code (Optional)</Label>
                  <Input
                    id="referral-code"
                    type="text"
                    placeholder="Enter referral code if you have one"
                    value={accountData.referralCode}
                    onChange={(e) => setAccountData({ ...accountData, referralCode: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Have a referral code? Enter it here to support your referrer!
                  </p>
                </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    ℹ️ You will only be able to log in once your hotel is approved by our admin team.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Terms & Contract */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  Platform Agreement
                </div>

                <Card className="p-6 bg-accent/20 max-h-[500px] overflow-y-auto">
                  <h3 className="font-bold text-xl mb-4 text-center">Hotel Partnership Agreement</h3>
                  
                  <div className="space-y-4 text-sm">
                    <section>
                      <h4 className="font-semibold mb-2">1. Agreement Overview</h4>
                      <p className="text-muted-foreground">
                        This agreement ("Agreement") is entered into between Wixotel Platform ("Platform") and the hotel 
                        property ("Partner") registering through this system. By accepting these terms, Partner agrees to 
                        list their property on the Platform under the conditions outlined below.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">2. Commission Structure</h4>
                      <p className="text-muted-foreground">
                        Platform charges an 8% commission on all confirmed bookings that result from guest leads generated 
                        through the Platform. Commission is calculated on the total booking amount and is due upon guest check-in.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">3. Partner Responsibilities</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>Maintain accurate room availability and pricing information</li>
                        <li>Respond to booking inquiries within 24 hours</li>
                        <li>Honor all confirmed reservations made through the Platform</li>
                        <li>Provide quality service meeting industry standards</li>
                        <li>Keep hotel information and photos current and accurate</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">4. Platform Services</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>Booking management system with calendar view</li>
                        <li>Lead generation and guest communication tools</li>
                        <li>Payment tracking and commission reporting</li>
                        <li>24/7 platform support and technical assistance</li>
                        <li>Marketing exposure on the Platform website</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">5. Cancellation Policy</h4>
                      <p className="text-muted-foreground">
                        Partner maintains control over their cancellation policies. Platform does not charge commission 
                        on cancelled bookings. Partner must communicate cancellation terms clearly to guests.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">6. Data & Privacy</h4>
                      <p className="text-muted-foreground">
                        Both parties agree to handle guest data responsibly and in compliance with applicable data 
                        protection laws (GDPR, etc.). Partner data remains confidential and will not be shared with 
                        third parties without consent.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">7. Quality Standards</h4>
                      <p className="text-muted-foreground">
                        Partner agrees to maintain their property in good condition and provide accurate descriptions. 
                        Platform reserves the right to remove listings that receive consistently poor reviews or violate 
                        quality standards.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">8. Payment Terms</h4>
                      <p className="text-muted-foreground">
                        Commission payments are due within 30 days of guest check-in. Platform provides monthly statements 
                        detailing all bookings and commission amounts owed.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">9. Termination</h4>
                      <p className="text-muted-foreground">
                        Either party may terminate this agreement with 30 days written notice. Upon termination, Partner 
                        remains responsible for honoring existing bookings and paying commissions on those bookings.
                      </p>
                    </section>

                    <section>
                      <h4 className="font-semibold mb-2">10. Approval Process</h4>
                      <p className="text-muted-foreground">
                        All hotel registrations are subject to Platform approval. We review applications within 24-48 hours. 
                        Platform reserves the right to decline applications that don't meet our partnership criteria.
                      </p>
                    </section>
                  </div>
                </Card>

                <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <input
                    type="checkbox"
                    id="accept-contract"
                    checked={acceptedContract}
                    onChange={(e) => setAcceptedContract(e.target.checked)}
                    className="w-5 h-5 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <label htmlFor="accept-contract" className="text-sm cursor-pointer select-none">
                    I have read and agree to the terms and conditions of this Hotel Partnership Agreement
                  </label>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    📄 A copy of this agreement along with your registration details will be sent to your email upon submission.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  Review & Submit
                </div>

                <Card className="p-6 bg-accent/20">
                  <h3 className="font-semibold text-lg mb-4">Hotel Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{hotelData.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{hotelData.email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{hotelData.phone}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{hotelData.city}, {hotelData.country}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-accent/20">
                  <h3 className="font-semibold text-lg mb-4">Rooms ({rooms.length})</h3>
                  <div className="space-y-3">
                    {rooms.map((room, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-background rounded-lg">
                        <div>
                          <p className="font-medium">{room.name}</p>
                          <p className="text-sm text-muted-foreground">Capacity: {room.capacity} guests</p>
                        </div>
                        <p className="font-bold text-primary">€{room.price}/night</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    🎉 Your hotel will be reviewed by our admin team within 24-48 hours. You'll receive an email once your hotel is approved and live on the platform!
                  </p>
                </div>
              </div>
            )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}

                {step < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="ml-auto bg-gradient-primary hover:opacity-90 transition-all shadow-elegant"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="ml-auto bg-gradient-primary hover:opacity-90 transition-all shadow-elegant"
                  >
                    {loading ? "Submitting..." : "Submit for Review"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column - How It Works */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start hidden lg:block">
            <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  How Wixotel Works
                </CardTitle>
                <CardDescription>
                  Manage your hotel with powerful tools designed for success
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 mt-1">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Visual Calendar</h3>
                      <p className="text-sm text-muted-foreground">
                        Track bookings, availability, and reservations at a glance with an intuitive timeline view
                      </p>
                    </div>
                  </div>
                  <img 
                    src={demoCalendar} 
                    alt="Calendar Management" 
                    className="rounded-lg border border-border/50 w-full shadow-lg"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 mt-1">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Booking Management</h3>
                      <p className="text-sm text-muted-foreground">
                        Handle reservations, guest details, and check-ins/checkouts effortlessly
                      </p>
                    </div>
                  </div>
                  <img 
                    src={demoBookings} 
                    alt="Booking Management" 
                    className="rounded-lg border border-border/50 w-full shadow-lg"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 mt-1">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Mobile Ready</h3>
                      <p className="text-sm text-muted-foreground">
                        Access your dashboard anywhere, anytime from any device
                      </p>
                    </div>
                  </div>
                  <img 
                    src={demoMobile} 
                    alt="Mobile Dashboard" 
                    className="rounded-lg border border-border/50 w-full shadow-lg"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelRegistration;