import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, Users, TrendingUp, Shield, Zap, Award, Target, Heart, Search, Menu, ArrowRight, CheckCircle, Globe } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BookingLookup } from "@/components/BookingLookup";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import aboutHeroImage from "@/assets/about-hero.jpg";
import aboutTeamImage from "@/assets/about-team.jpg";
import aboutTechImage from "@/assets/about-tech.jpg";
import aboutGuestsImage from "@/assets/about-guests.jpg";

const About = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingLookupOpen, setBookingLookupOpen] = useState(false);

  const values = [
    {
      icon: Target,
      title: "Our Mission",
      description: "To revolutionize hotel management with cutting-edge technology, making it accessible and efficient for properties of all sizes."
    },
    {
      icon: Heart,
      title: "Guest-Centric",
      description: "We believe in creating exceptional guest experiences through seamless technology and personalized service."
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "Your data and your guests' information are protected with enterprise-grade security measures."
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We strive for excellence in everything we do, from our platform features to customer support."
    }
  ];

  const stats = [
    { value: "30+", label: "Active Hotels", icon: Hotel },
    { value: "99.9%", label: "Uptime", icon: Zap },
    { value: "50K+", label: "Bookings Processed", icon: TrendingUp },
    { value: "24/7", label: "Support Available", icon: Users }
  ];

  const features = [
    "Automated booking management",
    "Real-time inventory sync",
    "AI-powered pricing optimization",
    "Multi-language support",
    "Advanced analytics & reporting",
    "Seamless integrations"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gradient-nav backdrop-blur-2xl border-b border-border/40 z-[100] shadow-md">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/about" className="text-sm font-medium text-primary transition-colors">
                About Us
              </Link>
              <Link to="/hotels" className="text-sm font-medium hover:text-primary transition-colors">
                Hotels
              </Link>
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingLookupOpen(true)}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Find My Booking
              </Button>
              <Link to="/auth">
                <Button className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105 hover:shadow-glow" size="sm">
                  Login
                </Button>
              </Link>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingLookupOpen(true)}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Find My Booking</span>
              </Button>
              <LanguageSwitcher />
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] z-[110]">
                  <div className="flex flex-col gap-6 mt-8">
                    <Link 
                      to="/hotels" 
                      className="text-lg font-medium hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Hotels
                    </Link>
                    <Link 
                      to="/about" 
                      className="text-lg font-medium hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      About Us
                    </Link>
                    <Link 
                      to="/register-hotel"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Hotel className="h-4 w-4 mr-2" />
                        Register Hotel
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:shadow-glow">
                        Login
                      </Button>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <BookingLookup 
        open={bookingLookupOpen} 
        onOpenChange={setBookingLookupOpen}
      />

      {/* Hero Section with Background Image */}
      <section className="relative pt-24 md:pt-32 pb-32 md:pb-48 px-2 sm:px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={aboutHeroImage} 
            alt="Modern hotel lobby" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/80"></div>
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-sm font-semibold text-primary mb-4 border border-primary/20">
              <Globe className="h-4 w-4" />
              ABOUT WIXOTEL
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Transforming Hotel Management for the{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Modern Era
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Empowering hospitality businesses worldwide with cutting-edge technology 
              and intuitive design.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/register-hotel">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105 hover:shadow-glow"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/hotels">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 backdrop-blur-sm bg-background/50 hover:bg-background/80"
                >
                  Explore Hotels
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Icons */}
      <section className="py-12 md:py-16 px-2 sm:px-4 md:px-6 -mt-24 md:-mt-32 relative z-20">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {stats.map((stat) => (
              <Card key={stat.label} className="group hover:shadow-elegant hover:scale-105 transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section with Team Image */}
      <section className="py-16 md:py-24 px-2 sm:px-4 md:px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center max-w-7xl mx-auto">
            <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
              <div className="space-y-4">
                <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary">
                  OUR STORY
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Built by Hoteliers, <br />
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    For Hoteliers
                  </span>
                </h2>
              </div>
              
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Wixotel was founded with a simple yet powerful vision: to create a hotel management 
                  system that hotel owners and managers would actually love to use. Born from years of 
                  experience in the hospitality industry, we understand the daily challenges faced by 
                  hotel operators.
                </p>
                
                <p>
                  Traditional hotel management systems are often outdated, complex, and expensive. 
                  We set out to change that by building a modern, intuitive platform that leverages 
                  the latest technology including AI and cloud computing to make hotel management 
                  effortless and efficient.
                </p>
                
                <p>
                  Today, Wixotel serves hotels of all sizes across multiple countries, helping them 
                  manage their operations, delight their guests, and grow their business.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Trusted by 30+ Hotels Worldwide</span>
              </div>
            </div>

            <div className="order-1 lg:order-2 relative group">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 rounded-3xl blur-2xl group-hover:opacity-30 transition-opacity"></div>
              <img 
                src={aboutTeamImage} 
                alt="Our team collaborating" 
                className="relative rounded-2xl shadow-2xl w-full h-auto group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 px-2 sm:px-4 md:px-6 bg-gradient-to-b from-background via-accent/30 to-background">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              OUR VALUES
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              What <span className="bg-gradient-primary bg-clip-text text-transparent">Drives Us</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Our core values guide every decision we make and every feature we build
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <Card 
                key={value.title} 
                className="group border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-card to-card/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{value.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {value.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 md:py-24 px-2 sm:px-4 md:px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center max-w-7xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 rounded-3xl blur-2xl group-hover:opacity-30 transition-opacity"></div>
              <img 
                src={aboutTechImage}
                alt="Hotel management technology" 
                className="relative rounded-2xl shadow-2xl w-full h-auto group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary">
                  TECHNOLOGY
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Powered by <br />
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    Innovation
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our platform combines cutting-edge technology with intuitive design 
                  to deliver an unmatched hotel management experience.
                </p>
              </div>

              <div className="grid gap-4">
                {features.map((feature, index) => (
                  <div 
                    key={feature} 
                    className="flex items-center gap-3 p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Experience Section */}
      <section className="py-16 md:py-24 px-2 sm:px-4 md:px-6 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            <div className="space-y-8 order-2 lg:order-1">
              <div className="space-y-4">
                <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary">
                  GUEST EXPERIENCE
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Delighting Guests <br />
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    Every Day
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our platform is designed to help you create exceptional guest experiences 
                  from booking to checkout. With automated workflows, personalized communication, 
                  and seamless operations, you can focus on what matters most – your guests.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-card hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Personalized Service</h3>
                    <p className="text-sm text-muted-foreground">Track guest preferences and deliver tailored experiences</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-card hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Instant Communication</h3>
                    <p className="text-sm text-muted-foreground">Automated emails and notifications keep guests informed</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-card hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Secure & Reliable</h3>
                    <p className="text-sm text-muted-foreground">Enterprise-grade security protects guest data</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 relative group">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 rounded-3xl blur-2xl group-hover:opacity-30 transition-opacity"></div>
              <img 
                src={aboutGuestsImage} 
                alt="Happy hotel guests" 
                className="relative rounded-2xl shadow-2xl w-full h-auto group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-2 sm:px-4 md:px-6">
        <div className="container mx-auto">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 overflow-hidden max-w-5xl mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 animate-pulse"></div>
            <CardContent className="p-6 sm:p-12 md:p-16 text-center space-y-8 relative z-10">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                  Ready to Transform <br />
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    Your Hotel?
                  </span>
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Join the growing community of hotels that trust Wixotel for their management needs
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/register-hotel">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105 hover:shadow-glow text-lg px-8"
                  >
                    <Hotel className="mr-2 h-5 w-5" />
                    Register Your Hotel
                  </Button>
                </Link>
                <Link to="/hotels">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-2 text-lg px-8"
                  >
                    Explore Hotels
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-2 sm:px-4 md:px-6 border-t bg-accent/30">
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
              <div className="space-y-2">
                <a href="mailto:support@wixotel.com" className="block text-sm text-primary hover:underline">support@wixotel.com</a>
              </div>
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

export default About;