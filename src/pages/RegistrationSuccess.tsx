import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Mail } from "lucide-react";

const RegistrationSuccess = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="w-full max-w-2xl relative z-10 animate-fade-in">
        <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
          
          <CardContent className="pt-12 pb-8 px-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
                <CheckCircle2 className="h-24 w-24 text-green-500 relative" />
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Registration Submitted!
                </h1>
                <p className="text-xl text-muted-foreground">
                  Your hotel registration is under review
                </p>
              </div>

              <div className="w-full max-w-md space-y-4 pt-6">
                <div className="flex items-start gap-4 p-4 bg-accent/20 rounded-lg">
                  <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h3 className="font-semibold mb-1">Review Process</h3>
                    <p className="text-sm text-muted-foreground">
                      Our admin team will review your hotel registration within 24-48 hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-accent/20 rounded-lg">
                  <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h3 className="font-semibold mb-1">Email Notification</h3>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email notification once your hotel is approved. You can then log in to access your dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-left">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Note:</strong> Your account has been created, but you'll only be able to log in after admin approval.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link to="/">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-all shadow-elegant">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
