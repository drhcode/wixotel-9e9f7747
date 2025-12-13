import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { HelmetProvider } from "react-helmet-async";

const Landing = lazy(() => import("./pages/Landing"));
const Hotels = lazy(() => import("./pages/Hotels"));
const CityHotels = lazy(() => import("./pages/CityHotels"));
const About = lazy(() => import("./pages/About"));
const RegisterHotelInfo = lazy(() => import("./pages/RegisterHotelInfo"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const HotelPublicView = lazy(() => import("./pages/HotelPublicView"));
const HotelRegistration = lazy(() => import("./pages/HotelRegistration"));
const RegistrationSuccess = lazy(() => import("./pages/RegistrationSuccess"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const NotFound = lazy(() => import("./pages/NotFound"));
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { BedLoader } from "@/components/ui/bed-loader";
import { CookieConsent } from "@/components/CookieConsent";

const queryClient = new QueryClient();

const isMobileSafari = /iP(hone|ad|od)/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS/.test(navigator.userAgent);
const Router = isMobileSafari ? HashRouter : BrowserRouter;

const App = () => (
  <GlobalErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider delayDuration={200} skipDelayDuration={300}>
            <Toaster />
            <Sonner />
            <Router>
            <CookieConsent />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><BedLoader size="lg" /></div>}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/hotels" element={<Hotels />} />
                <Route path="/city-hotels" element={<CityHotels />} />
                <Route path="/about" element={<About />} />
                <Route path="/register-hotel" element={<HotelRegistration />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/hotel/:hotelSlug" element={<HotelPublicView />} />
                <Route path="/booking/:confirmationNumber" element={<BookingDetails />} />
                <Route path="/hotel-registration" element={<HotelRegistration />} />
                <Route path="/registration-success" element={<RegistrationSuccess />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </Router>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </GlobalErrorBoundary>
);

export default App;
