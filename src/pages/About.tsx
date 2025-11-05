import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, Users, TrendingUp, Shield, Zap, Award, Target, Heart } from "lucide-react";

const About = () => {
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
    { value: "30+", label: "Active Hotels" },
    { value: "99.9%", label: "Uptime" },
    { value: "50K+", label: "Bookings Processed" },
    { value: "24/7", label: "Support Available" }
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
              <Link to="/about" className="text-sm font-medium text-primary">
                About Us
              </Link>
              <Link to="/register-hotel">
                <Button size="sm" variant="outline">
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
      <section className="pt-32 pb-24 px-4 md:px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              ABOUT WIXOTEL
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Transforming Hotel Management for the{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Modern Era
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Wixotel is a comprehensive hotel management platform designed to streamline operations, 
              enhance guest experiences, and drive revenue growth for hospitality businesses worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-accent/30 to-background">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Our Story</h2>
              <p className="text-lg text-muted-foreground">
                Built by hoteliers, for hoteliers
              </p>
            </div>
            
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <p className="text-lg leading-relaxed">
                Wixotel was founded with a simple yet powerful vision: to create a hotel management 
                system that hotel owners and managers would actually love to use. Born from years of 
                experience in the hospitality industry, we understand the daily challenges faced by 
                hotel operators.
              </p>
              
              <p className="text-lg leading-relaxed">
                Traditional hotel management systems are often outdated, complex, and expensive. 
                We set out to change that by building a modern, intuitive platform that leverages 
                the latest technology including AI and cloud computing to make hotel management 
                effortless and efficient.
              </p>
              
              <p className="text-lg leading-relaxed">
                Today, Wixotel serves hotels of all sizes across multiple countries, helping them 
                manage their operations, delight their guests, and grow their business. Our commitment 
                to innovation and customer success continues to drive everything we do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary mb-4">
              OUR VALUES
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">What Drives Us</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our core values guide every decision we make and every feature we build
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {values.map((value) => (
              <Card key={value.title} className="border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <value.icon className="h-7 w-7 text-primary" />
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

      {/* Features Highlight */}
      <section className="py-24 px-4 md:px-6 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Why Choose Wixotel?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We combine powerful features with intuitive design
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Hotel className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>All-in-One Platform</CardTitle>
                <CardDescription>
                  Manage everything from bookings to billing, all in one unified dashboard
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI-Powered</CardTitle>
                <CardDescription>
                  Leverage artificial intelligence for smart pricing and automated guest communication
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all duration-300">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>24/7 Support</CardTitle>
                <CardDescription>
                  Our dedicated support team is always ready to help you succeed
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-6">
        <div className="container mx-auto">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 overflow-hidden">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Ready to Transform Your Hotel?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join the growing community of hotels that trust Wixotel for their management needs
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/register-hotel">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant hover:scale-105"
                  >
                    <Hotel className="mr-2 h-5 w-5" />
                    Register Your Hotel
                  </Button>
                </Link>
                <Link to="/hotels">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-2"
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
      <footer className="py-12 px-4 md:px-6 border-t">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © 2025 WIXOTEL. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
