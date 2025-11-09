import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, BedDouble, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full shadow-elegant border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Illustration */}
            <div className="bg-gradient-subtle p-8 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
              <div className="relative z-10">
                <BedDouble className="h-32 w-32 text-primary animate-pulse" strokeWidth={1.5} />
                <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl"></div>
                <div className="absolute -top-4 -left-4 h-20 w-20 rounded-full bg-primary-glow/20 blur-xl"></div>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="p-8 flex flex-col justify-center">
              <div className="space-y-6">
                <div>
                  <div className="inline-block mb-4">
                    <span className="text-7xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">
                      404
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold mb-3">Room Not Found</h1>
                  <p className="text-muted-foreground leading-relaxed">
                    Oops! It seems this room has been fully booked or doesn't exist. 
                    Let's get you back to a comfortable place.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate("/")}
                    className="w-full gap-2 shadow-glow hover:shadow-elegant transition-all"
                    size="lg"
                  >
                    <Home className="h-5 w-5" />
                    Go to Homepage
                  </Button>
                  
                  <Button
                    onClick={() => navigate(-1)}
                    variant="outline"
                    className="w-full gap-2 hover:bg-accent/50 transition-all"
                    size="lg"
                  >
                    Go Back
                  </Button>

                  <Button
                    onClick={() => navigate("/hotels")}
                    variant="ghost"
                    className="w-full gap-2 hover:bg-muted transition-all"
                  >
                    <Search className="h-4 w-4" />
                    Browse Hotels
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Need help? Contact our{" "}
                    <button
                      onClick={() => navigate("/about")}
                      className="text-primary hover:underline transition-colors"
                    >
                      support team
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary-glow/5 blur-3xl animate-pulse delay-1000"></div>
      </div>
    </div>
  );
};

export default NotFound;
