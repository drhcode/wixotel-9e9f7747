import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Wixotel ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our hotel management platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-3">2.1 Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Name, email address, phone number</li>
                <li>Hotel business information and registration details</li>
                <li>Payment and billing information</li>
                <li>Guest information you input into our system</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>IP address, browser type, and device information</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide and maintain our services</li>
                <li>Process transactions and send confirmations</li>
                <li>Send administrative information and updates</li>
                <li>Improve our platform and user experience</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and ensure security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We do not sell your personal information. We may share your data with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Service providers who assist in our operations</li>
                <li>Payment processors for transaction handling</li>
                <li>Law enforcement when required by law</li>
                <li>Business partners with your consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security assessments.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Your Rights (GDPR)</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Under GDPR, you have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Rectify inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service is not intended for individuals under 16 years of age. We do not knowingly collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at:
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

export default PrivacyPolicy;
