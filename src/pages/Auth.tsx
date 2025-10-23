import { useState } from "react";
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

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { executeRecaptcha } = useRecaptcha();
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    fullName: "",
    hotelName: "",
    hotelAddress: "",
    phone: ""
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha('signup');
      if (recaptchaToken) {
        const { data: verifyData } = await supabase.functions.invoke('verify-recaptcha', {
          body: { token: recaptchaToken }
        });

        if (!verifyData?.success) {
          toast.error("reCAPTCHA verification failed. Please try again.");
          setLoading(false);
          return;
        }
      }

      // Sign up the user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
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
      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha('login');
      if (recaptchaToken) {
        const { data: verifyData } = await supabase.functions.invoke('verify-recaptcha', {
          body: { token: recaptchaToken }
        });

        if (!verifyData?.success) {
          toast.error("reCAPTCHA verification failed. Please try again.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        
        <div className="flex items-center justify-center gap-2 mb-8">
          <Hotel className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            HotelManager
          </span>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="hotel@example.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="hotel@example.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel-name">Hotel Name</Label>
                    <Input
                      id="hotel-name"
                      type="text"
                      placeholder="Grand Hotel"
                      value={signupData.hotelName}
                      onChange={(e) => setSignupData({ ...signupData, hotelName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel-address">Hotel Address</Label>
                    <Input
                      id="hotel-address"
                      type="text"
                      placeholder="123 Main St, City"
                      value={signupData.hotelAddress}
                      onChange={(e) => setSignupData({ ...signupData, hotelAddress: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel-phone">Phone</Label>
                    <Input
                      id="hotel-phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Your hotel will be reviewed and activated within 24 hours
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
