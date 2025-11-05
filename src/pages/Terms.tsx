import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-xl border-b border-border/50 z-50 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-3xl font-batangas font-bold bg-gradient-primary bg-clip-text text-transparent">WIXOTEL</span>
            </Link>
            <Link to="/">
              <Button size="sm" variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-16 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Wixotel's platform, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                Wixotel provides a cloud-based hotel management platform that enables hotels to manage bookings, guests, rooms, and other operational aspects of their business.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You must provide accurate and complete information during registration</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must notify us immediately of any unauthorized access</li>
                <li>You are responsible for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Subscription and Payment</h2>
              <h3 className="text-xl font-semibold mb-3">4.1 Fees</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Subscription fees are billed in advance on a monthly or annual basis depending on your chosen plan.
              </p>
              
              <h3 className="text-xl font-semibold mb-3">4.2 Refunds</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Subscription fees are non-refundable except as required by law.
              </p>
              
              <h3 className="text-xl font-semibold mb-3">4.3 Cancellation</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may cancel your subscription at any time. Cancellation will be effective at the end of your current billing period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code or viruses</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the service for fraudulent purposes</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Data Ownership</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain all rights to the data you input into our platform. We do not claim ownership of your hotel or guest data. You grant us a license to use this data solely to provide our services to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive for 99.9% uptime, we do not guarantee uninterrupted access to our services. We may perform maintenance that temporarily affects availability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Wixotel shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content, features, and functionality of the Wixotel platform are owned by us and protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account if you violate these terms or engage in conduct that we deem harmful to our service or other users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify these terms at any time. We will notify you of significant changes via email or through the platform. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms are governed by and construed in accordance with applicable EU laws and regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-primary font-medium mt-3">
                Email: support@wixotel.com
              </p>
            </section>
          </div>
        </div>
      </div>

      <footer className="py-12 px-4 md:px-6 border-t mt-16">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">© 2025 WIXOTEL. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
