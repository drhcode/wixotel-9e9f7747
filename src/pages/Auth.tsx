import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters"),
});

const signupSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(100).regex(/[A-Z]/, "Need uppercase").regex(/[0-9]/, "Need number"),
  fullName: z.string().trim().min(2).max(100),
  hotelName: z.string().trim().min(2).max(100),
  hotelAddress: z.string().trim().min(5).max(500),
  phone: z.string().regex(/^[+\d\s()-]{7,20}$/, "Invalid phone"),
  roomCount: z.number().min(1, "At least 1 room").max(1000, "Max 1000 rooms"),
});

const Auth = () => {
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);
  const [loading, setLoading] = useState(false);
  const { executeRecaptcha } = useRecaptcha();
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    fullName: "",
    hotelName: "",
    hotelAddress: "",
    phone: "",
    roomCount: 1
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = signupSchema.safeParse(signupData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const recaptchaToken = await executeRecaptcha('signup');
      if (recaptchaToken) {
        try {
          const { data: verifyData } = await supabase.functions.invoke('verify-recaptcha', {
            body: { token: recaptchaToken }
          });

          if (!verifyData?.success) {
            console.warn('reCAPTCHA verification failed, continuing anyway');
          }
        } catch (error) {
          console.warn('reCAPTCHA verification error, continuing anyway:', error);
        }
      }

      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: signupData.fullName
          }
        }
      });

      if (signupError) throw signupError;

      if (authData.user) {
        // Create hotel for the new user (pending approval)
        const { error: hotelError } = await supabase
          .from('hotels')
          .insert({
            owner_id: authData.user.id,
            name: signupData.hotelName,
            address: signupData.hotelAddress,
            phone: signupData.phone,
            status: 'pending'
          });

        if (hotelError) throw hotelError;

        toast.success("Registration successful! Your hotel is pending approval.");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = loginSchema.safeParse(loginData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const recaptchaToken = await executeRecaptcha('login');
      if (recaptchaToken) {
        try {
          const { data: verifyData } = await supabase.functions.invoke('verify-recaptcha', {
            body: { token: recaptchaToken }
          });

          if (!verifyData?.success) {
            console.warn('reCAPTCHA verification failed, continuing anyway');
          }
        } catch (error) {
          console.warn('reCAPTCHA verification error, continuing anyway:', error);
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password
      });

      if (error) throw error;

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-sm text-muted-foreground hover:text-primary transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>
        
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="p-2 bg-gradient-primary rounded-xl shadow-elegant">
            <Hotel className="h-8 w-8 text-white" />
          </div>
          <span className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Wixotel
          </span>
        </div>

        <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-3xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center text-base">Access your hotel management dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold">Email Address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-semibold">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow hover:scale-[1.02]" 
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Signing in...
                      </span>
                    ) : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-semibold">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        className="h-11 border-border/50 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotel-phone" className="text-sm font-semibold">Phone</Label>
                      <Input
                        id="hotel-phone"
                        type="tel"
                        placeholder="+1 234 567"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        className="h-11 border-border/50 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@hotel.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-semibold">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel-name" className="text-sm font-semibold">Hotel Name</Label>
                    <Input
                      id="hotel-name"
                      type="text"
                      placeholder="Grand Hotel"
                      value={signupData.hotelName}
                      onChange={(e) => setSignupData({ ...signupData, hotelName: e.target.value })}
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel-address" className="text-sm font-semibold">Hotel Address</Label>
                    <Input
                      id="hotel-address"
                      type="text"
                      placeholder="123 Main St, City"
                      value={signupData.hotelAddress}
                      onChange={(e) => setSignupData({ ...signupData, hotelAddress: e.target.value })}
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room-count" className="text-sm font-semibold">Number of Rooms</Label>
                    <Input
                      id="room-count"
                      type="number"
                      min="1"
                      max="1000"
                      placeholder="10"
                      value={signupData.roomCount}
                      onChange={(e) => setSignupData({ ...signupData, roomCount: parseInt(e.target.value) || 1 })}
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow hover:scale-[1.02]" 
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Creating account...
                      </span>
                    ) : "Create Account"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center bg-accent/50 p-3 rounded-lg border border-border/50">
                    🎉 Your hotel will be reviewed and activated within 24 hours
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
