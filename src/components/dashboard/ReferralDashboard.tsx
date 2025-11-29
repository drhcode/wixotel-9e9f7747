import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, Users, DollarSign, TrendingUp, Calendar, Copy, Settings } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ReferralData {
  id: string;
  referral_code: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface ReferredHotel {
  id: string;
  name: string;
  created_at: string;
  status: string;
  plan_id: string;
  subscription_plan: string;
  plan_price: number;
}

interface Earning {
  id: string;
  month_year: string;
  plan_amount: number;
  commission_amount: number;
  status: string;
  hotel_name: string;
}

const ReferralDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referredHotels, setReferredHotels] = useState<ReferredHotel[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState({
    totalHotels: 0,
    activeHotels: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get referral profile
      const { data: referral, error: referralError } = await supabase
        .from("referrals")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (referralError) throw referralError;
      setReferralData(referral);
      setEditForm({
        full_name: referral.full_name,
        email: referral.email,
        phone: referral.phone || "",
      });

      // Get referred hotels
      const { data: hotels, error: hotelsError } = await supabase
        .from("hotels")
        .select(`
          id,
          name,
          created_at,
          status,
          plan_id,
          subscription_plan,
          subscription_plans!hotels_plan_id_fkey (
            price
          )
        `)
        .eq("referred_by", referral.id)
        .order("created_at", { ascending: false });

      if (hotelsError) throw hotelsError;

      const formattedHotels = hotels?.map(h => ({
        id: h.id,
        name: h.name,
        created_at: h.created_at,
        status: h.status,
        plan_id: h.plan_id,
        subscription_plan: h.subscription_plan || "basic",
        plan_price: (h.subscription_plans as any)?.price || 0,
      })) || [];

      setReferredHotels(formattedHotels);

      // Get earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from("referral_earnings")
        .select(`
          *,
          hotels (name)
        `)
        .eq("referral_id", referral.id)
        .order("month_year", { ascending: false });

      if (earningsError) throw earningsError;

      const formattedEarnings = earningsData?.map(e => ({
        id: e.id,
        month_year: e.month_year,
        plan_amount: e.plan_amount,
        commission_amount: e.commission_amount,
        status: e.status,
        hotel_name: (e.hotels as any)?.name || "Unknown",
      })) || [];

      setEarnings(formattedEarnings);

      // Calculate stats
      const activeHotels = formattedHotels.filter(h => h.status === "active").length;
      const totalEarnings = formattedEarnings
        .filter(e => e.status === "paid")
        .reduce((sum, e) => sum + Number(e.commission_amount), 0);
      const pendingEarnings = formattedEarnings
        .filter(e => e.status === "pending")
        .reduce((sum, e) => sum + Number(e.commission_amount), 0);

      setStats({
        totalHotels: formattedHotels.length,
        activeHotels,
        totalEarnings,
        pendingEarnings,
      });

    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Failed to load referral data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('user_role');
    navigate("/auth");
  };

  const copyReferralCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      toast.success("Referral code copied to clipboard!");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
      active: "default",
      pending: "outline",
      suspended: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getEarningStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
      paid: "default",
      pending: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const handleUpdateProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("referrals")
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setEditDialogOpen(false);
      fetchReferralData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/images/hotelhub-logo-hd.png" 
              alt="Wixotel" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">{referralData?.full_name}</h1>
              <p className="text-sm text-muted-foreground">Referral Partner</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>Update your referral profile information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleUpdateProfile} className="w-full">
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Referral Code Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>Share this code with hotels to earn 10% commission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <code className="flex-1 px-4 py-3 bg-muted rounded-lg text-2xl font-mono font-bold">
                {referralData?.referral_code}
              </code>
              <Button onClick={copyReferralCode} size="lg">
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hotels</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHotels}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Hotels</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeHotels}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.pendingEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Referred Hotels */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Referred Hotels</CardTitle>
            <CardDescription>Hotels that signed up with your referral code</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel Name</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monthly Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referredHotels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No referred hotels yet. Share your referral code to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  referredHotels.map((hotel) => (
                    <TableRow key={hotel.id}>
                      <TableCell className="font-medium">{hotel.name}</TableCell>
                      <TableCell>{format(new Date(hotel.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="capitalize">{hotel.subscription_plan}</TableCell>
                      <TableCell>€{hotel.plan_price.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(hotel.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Earnings History */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>Monthly commission earnings from referred hotels</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Plan Amount</TableHead>
                  <TableHead>Commission (10%)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No earnings yet
                    </TableCell>
                  </TableRow>
                ) : (
                  earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>{earning.month_year}</TableCell>
                      <TableCell>{earning.hotel_name}</TableCell>
                      <TableCell>€{earning.plan_amount.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">€{earning.commission_amount.toFixed(2)}</TableCell>
                      <TableCell>{getEarningStatusBadge(earning.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferralDashboard;