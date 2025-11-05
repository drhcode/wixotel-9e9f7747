import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, CheckCircle2, FileText, CreditCard, Rocket } from "lucide-react";
import heroImage from "@/assets/hotel-hero.jpg";

const RegisterHotelInfo = () => {
  const steps = [
    {
      icon: FileText,
      title: "Create Your Account",
      description: "Sign up with your email and basic information. It takes less than 2 minutes to get started.",
      step: "Step 1"
    },
    {
      icon: Hotel,
      title: "Add Hotel Details",
      description: "Enter your hotel information, upload photos, and describe your property and amenities.",
      step: "Step 2"
    },
    {
      icon: CreditCard,
      title: "Choose Your Plan",
      description: "Select a subscription plan that fits your needs. All plans include a 14-day free trial.",
      step: "Step 3"
    },
    {
      icon: Rocket,
      title: "Go Live",
      description: "Your hotel will be reviewed and activated within 24 hours. Start accepting bookings immediately!",
      step: "Step 4"
    }
  ];

  const benefits = [
    "Instant booking confirmations",
    "Real-time calendar management",
    "Automated guest communications",
    "Detailed analytics and reports",
    "Secure payment processing",
    "24/7 customer support",
    "Mobile-friendly interface",
    "No setup fees"
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-xl border-b border-border/50 z-50 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/hotels" className="text-sm font-medium hover:text-primary transition-colors">
                Hotels
              </Link>
              <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">
                About Us
              </Link>
              <Link to="/register-hotel">
                <Button size="sm" variant="outline" className="border-primary text-primary">
                  Register Hotel
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-gradient-primary hover:opacity-90 transition-all" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 md:px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
                GET STARTED
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                Register Your{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Hotel Today
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Join the growing community of hotels using Wixotel to streamline operations, 
                increase bookings, and deliver exceptional guest experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/auth?mode=register">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105"
                  >
                    <Hotel className="mr-2 h-5 w-5" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/about">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-2"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                <img 
                  src={heroImage} 
                  alt="Modern hotel lobby and management interface" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-24 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              SIMPLE PROCESS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get your hotel up and running in just 4 easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <Card key={step.title} className="border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-primary">{step.step}</span>
                  </div>
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-accent/30 to-background">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
                BENEFITS
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">What You'll Get</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to manage your hotel successfully
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {benefits.map((benefit) => (
                <Card key={benefit} className="border-border/50 bg-card">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-base font-medium">{benefit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Flexible Pricing</h2>
              <p className="text-lg text-muted-foreground">
                Choose a plan that grows with your business
              </p>
            </div>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
              <CardContent className="p-8 md:p-12 text-center space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary uppercase tracking-wide">Starting From</p>
                  <p className="text-5xl md:text-6xl font-bold">€15.99<span className="text-2xl text-muted-foreground">/month</span></p>
                </div>
                <p className="text-lg text-muted-foreground">
                  All plans include a 14-day free trial. No credit card required to start.
                </p>
                <Link to="/auth?mode=register">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105"
                  >
                    Start Your Free Trial
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  View detailed pricing after creating your account
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-6 border-t bg-accent/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">Modern hotel management for the digital age</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2">
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <a href="mailto:support@wixotel.com" className="block text-sm text-primary hover:underline">support@wixotel.com</a>
            </div>
          </div>
          <div className="border-t pt-8 text-center">
            <p className="text-sm text-muted-foreground">© 2025 WIXOTEL. All rights reserved. GDPR Compliant.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegisterHotelInfo;
