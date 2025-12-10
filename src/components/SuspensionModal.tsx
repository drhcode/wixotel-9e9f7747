import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface SuspensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WHATSAPP_NUMBER = "+447400754801";
const WHATSAPP_MESSAGE = "Hello, I need help with my suspended account due to an overdue invoice.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const SUPPORT_EMAIL = "support@wixotel.com";

export function SuspensionModal({ open, onOpenChange }: SuspensionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-bold text-destructive">
            Account Suspended
          </DialogTitle>
          <DialogDescription className="text-center text-base leading-relaxed">
            Your account has been suspended due to an unpaid invoice that is more than 12 days overdue. 
            Please contact support to resolve your payment and restore access.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Email Contact */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Email Support</p>
              <a 
                href={`mailto:${SUPPORT_EMAIL}`} 
                className="text-sm font-medium text-primary hover:underline truncate block"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          {/* WhatsApp Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span>Contact via WhatsApp</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* QR Code */}
              <div className="p-3 bg-white rounded-lg border shadow-sm">
                <QRCodeSVG 
                  value={WHATSAPP_URL} 
                  size={100}
                  level="M"
                  includeMargin={false}
                />
              </div>
              
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  Scan the QR code or click the button below to chat with us on WhatsApp
                </p>
                <Button 
                  asChild
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                >
                  <a 
                    href={WHATSAPP_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
