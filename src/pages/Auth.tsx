import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { mapAuthError } from "@/lib/errorUtils";
import { useRecaptcha } from "@/hooks/useRecaptcha";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one symbol"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { executeRecaptcha } = useRecaptcha();

  // Check if user is already logged in
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session) {
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

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

      // Execute reCAPTCHA
      let recaptchaToken: string;
      try {
        recaptchaToken = await executeRecaptcha('login');
      } catch (error) {
        console.error('reCAPTCHA error:', error);
        toast.error('Security verification failed. Please refresh and try again.');
        setLoading(false);
        return;
      }

      // Verify reCAPTCHA token
      const { data: recaptchaResult, error: recaptchaError } = await supabase.functions.invoke('verify-recaptcha', {
        body: { token: recaptchaToken, action: 'login' }
      });

      if (recaptchaError || !recaptchaResult?.passed) {
        console.error('reCAPTCHA verification failed:', recaptchaResult);
        toast.error('Security verification failed. Please try again.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password
      });

      if (error) throw error;

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      if (data.user) {
        // Check if user's hotel is approved
        const { data: hotel, error: hotelError } = await supabase
          .from('hotels')
          .select('id, status')
          .eq('owner_id', data.user.id)
          .maybeSingle();

        if (hotelError || !hotel) {
          // Check if user is super admin or referral
          const { data: role } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (role?.role === 'super_admin' || role?.role === 'referral') {
            toast.success("Welcome back!");
            navigate("/dashboard");
            return;
          }

          // No hotel found and not admin/referral
          await supabase.auth.signOut();
          toast.error("Your hotel registration was not found.");
          return;
        }

        if (hotel.status !== 'active') {
          // Hotel not approved yet
          await supabase.auth.signOut();
          toast.error("Your hotel is still pending approval. You'll be notified once approved.");
          return;
        }

        // Check if hotel has invoices overdue by 14+ days
        const today = new Date().toISOString().split('T')[0];
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

        const { data: overdueInvoice } = await supabase
          .from('invoices')
          .select('due_date')
          .eq('hotel_id', hotel.id)
          .in('status', ['pending', 'overdue'])
          .lte('due_date', fourteenDaysAgoStr)
          .limit(1)
          .maybeSingle();

        if (overdueInvoice) {
          await supabase.auth.signOut();
          toast.error("Account Suspended", {
            description: "Your account has been suspended due to an unpaid invoice that is more than 14 days overdue. Please contact support@wixotel.com to resolve your payment and restore access.",
            duration: 10000,
          });
          return;
        }

        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-sm text-muted-foreground hover:text-primary transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>
        
        <div className="flex items-center justify-center mb-10">
          <span className="text-5xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent drop-shadow-2xl">
            WIXOTEL
          </span>
        </div>

        <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
          <CardHeader className="space-y-3 pb-6 pt-8">
            <CardTitle className="text-3xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-base">
              Sign in to access your hotel management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-semibold">Email Address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="h-12 border-border/50 focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label 
                  htmlFor="remember-me" 
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  Remember me (stay logged in)
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-semibold">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="h-12 border-border/50 focus:border-primary transition-all"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow hover:scale-[1.02] text-base font-semibold" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In to Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
