import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, Eye, Loader2 } from "lucide-react";

interface ReferralApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export default function ReferralApplications() {
  const [applications, setApplications] = useState<ReferralApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ReferralApplication | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('referral_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      toast.error("Failed to load applications");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const code = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setReferralCode(code);
  };

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const symbols = '!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += symbols.charAt(Math.floor(Math.random() * symbols.length));
    // Shuffle the password
    pwd = pwd.split('').sort(() => Math.random() - 0.5).join('');
    setPassword(pwd);
  };

  const openApproveDialog = (app: ReferralApplication) => {
    setSelectedApp(app);
    generateReferralCode();
    generateSecurePassword();
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!referralCode || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setProcessing(true);
    try {
      // Create referral user via edge function
      const { data: userData, error: userError } = await supabase.functions.invoke('create-referral-user', {
        body: {
          full_name: selectedApp.full_name,
          email: selectedApp.email,
          password: password,
          phone: selectedApp.phone,
          referral_code: referralCode,
        }
      });

      if (userError) throw userError;

      // Update application status
      const { error: updateError } = await supabase
        .from('referral_applications')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedApp.id);

      if (updateError) throw updateError;

      // Send approval email via edge function
      await supabase.functions.invoke('send-referral-notification', {
        body: {
          email: selectedApp.email,
          full_name: selectedApp.full_name,
          type: 'approved',
          referral_code: referralCode,
          password: password
        }
      });

      toast.success("Referral application approved successfully");
      setApproveDialogOpen(false);
      setReferralCode("");
      setPassword("");
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve application");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from('referral_applications')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', selectedApp.id);

      if (updateError) throw updateError;

      // Send rejection email
      await supabase.functions.invoke('send-referral-notification', {
        body: {
          email: selectedApp.email,
          full_name: selectedApp.full_name,
          type: 'rejected',
          rejection_reason: rejectionReason
        }
      });

      toast.success("Application rejected");
      setRejectDialogOpen(false);
      setRejectionReason("");
      fetchApplications();
    } catch (error: any) {
      toast.error("Failed to reject application");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Referral Applications</CardTitle>
          <CardDescription>Review and approve/reject referral partner applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.full_name}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{app.phone || '-'}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedApp(app);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => openApproveDialog(app)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Full details of the referral application</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm">{selectedApp.full_name}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm">{selectedApp.email}</p>
              </div>
              <div>
                <Label>Phone</Label>
                <p className="text-sm">{selectedApp.phone || 'Not provided'}</p>
              </div>
              <div>
                <Label>Message</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedApp.message || 'No message'}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
              </div>
              {selectedApp.rejection_reason && (
                <div>
                  <Label>Rejection Reason</Label>
                  <p className="text-sm text-muted-foreground">{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Referral Application</DialogTitle>
            <DialogDescription>
              Approving will create an account and send login credentials to {selectedApp?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">What happens next:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                <li>Account is created with the credentials below</li>
                <li>Email is sent to {selectedApp?.email} with login details</li>
                <li>Referral user can login and start referring hotels</li>
              </ol>
            </div>
            <div>
              <Label>Referral Code</Label>
              <div className="flex gap-2">
                <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                <Button variant="outline" size="sm" onClick={generateReferralCode}>Regenerate</Button>
              </div>
            </div>
            <div>
              <Label>Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Auto-generated password"
                />
                <Button variant="outline" size="sm" onClick={generateSecurePassword}>Regenerate</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This password will be sent to the user via email. They should change it after first login.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Approve & Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this application is being rejected..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
