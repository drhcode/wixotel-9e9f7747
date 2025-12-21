import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, Key } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Referral {
  id: string;
  user_id: string;
  referral_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  hotel_count?: number;
  total_earnings?: number;
}

const ReferralsManagement = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    referral_code: "",
  });

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get hotel count and earnings for each referral
      const referralsWithStats = await Promise.all(
        (data || []).map(async (referral) => {
          const { count } = await supabase
            .from("hotels")
            .select("*", { count: "exact", head: true })
            .eq("referred_by", referral.id);

          const { data: earnings } = await supabase
            .from("referral_earnings")
            .select("commission_amount")
            .eq("referral_id", referral.id)
            .eq("status", "paid");

          const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;

          return {
            ...referral,
            hotel_count: count || 0,
            total_earnings: totalEarnings,
          };
        })
      );

      setReferrals(referralsWithStats);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast.error("Failed to load referrals");
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setFormData(prev => ({ ...prev, referral_code: code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingReferral) {
        // Update existing referral
        const { error } = await supabase
          .from("referrals")
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone || null,
            referral_code: formData.referral_code,
          })
          .eq("id", editingReferral.id);

        if (error) throw error;
        toast.success("Referral updated successfully");
      } else {
        // Create new referral user via edge function to avoid logging out the super admin
        const { data, error } = await supabase.functions.invoke('create-referral-user', {
          body: {
            full_name: formData.full_name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone || null,
            referral_code: formData.referral_code,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success("Referral created successfully");
      }

      setOpen(false);
      resetForm();
      fetchReferrals();
    } catch (error: any) {
      console.error("Error saving referral:", error);
      toast.error(error.message || "Failed to save referral");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (referral: Referral) => {
    setEditingReferral(referral);
    setFormData({
      full_name: referral.full_name,
      email: referral.email,
      phone: referral.phone || "",
      password: "",
      referral_code: referral.referral_code,
    });
    setOpen(true);
  };

  const handleDelete = async (referral: Referral) => {
    if (!confirm(`Are you sure you want to delete ${referral.full_name}? This will permanently remove their account and all associated data.`)) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-referral-user', {
        body: {
          referral_id: referral.id,
          user_id: referral.user_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Referral user deleted successfully");
      fetchReferrals();
    } catch (error: any) {
      console.error("Error deleting referral:", error);
      toast.error(error.message || "Failed to delete referral");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("referrals")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Referral ${!currentStatus ? "activated" : "deactivated"}`);
      fetchReferrals();
    } catch (error) {
      console.error("Error toggling referral status:", error);
      toast.error("Failed to update status");
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      referral_code: "",
    });
    setEditingReferral(null);
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const openPasswordDialog = (referral: Referral) => {
    setSelectedReferral(referral);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const handlePasswordReset = async () => {
    if (!selectedReferral || !newPassword) return;

    // Validate password
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      toast.error("Password must contain at least one symbol");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-referral-password', {
        body: {
          user_id: selectedReferral.user_id,
          new_password: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Password reset successfully for ${selectedReferral.full_name}`);
      setPasswordDialogOpen(false);
      setSelectedReferral(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Referrals Management</h2>
          <p className="text-muted-foreground">Manage referral partners and track their earnings</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Referral
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingReferral ? "Edit Referral" : "Create New Referral"}</DialogTitle>
                <DialogDescription>
                  {editingReferral ? "Update referral information" : "Create a new referral partner account"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingReferral}
                  />
                </div>
                {!editingReferral && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral_code">Referral Code *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="referral_code"
                      value={formData.referral_code}
                      onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                      required
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={generateReferralCode}>
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingReferral ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Hotels</TableHead>
              <TableHead>Total Earnings</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : referrals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No referrals yet. Create your first referral partner.
                </TableCell>
              </TableRow>
            ) : (
              referrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell className="font-medium">{referral.full_name}</TableCell>
                  <TableCell>{referral.email}</TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                      {referral.referral_code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {referral.hotel_count}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    €{referral.total_earnings?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={referral.is_active}
                      onCheckedChange={() => toggleActive(referral.id, referral.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPasswordDialog(referral)}
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(referral)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(referral)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedReferral?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with one uppercase letter and one symbol
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset} disabled={loading || !newPassword}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralsManagement;