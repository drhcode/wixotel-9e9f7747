import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, X, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";

interface SupportManagerProps {
  hotelId: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketReply {
  id: string;
  message: string;
  attachments: string[] | null;
  is_admin_reply: boolean;
  created_at: string;
  user_id: string;
}

export default function SupportManager({ hotelId }: SupportManagerProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    fetchTickets();
  }, [hotelId]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error: any) {
      toast.error("Failed to load replies");
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload files first
      const attachmentUrls: string[] = [];
      for (const file of uploadingFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);
        
        attachmentUrls.push(fileName);
      }

      const { error } = await supabase.from("support_tickets").insert({
        hotel_id: hotelId,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Support ticket created successfully");
      setNewTicket({ subject: "", description: "", priority: "medium" });
      setUploadingFiles([]);
      setCreateDialogOpen(false);
      fetchTickets();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload files
      const attachmentUrls: string[] = [];
      for (const file of uploadingFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        attachmentUrls.push(fileName);
      }

      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: replyMessage,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        is_admin_reply: false,
      });

      if (error) throw error;

      toast.success("Reply sent");
      setReplyMessage("");
      setUploadingFiles([]);
      fetchReplies(selectedTicket.id);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadingFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const viewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
    fetchReplies(ticket.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-500";
      case "in_progress": return "bg-yellow-500";
      case "resolved": return "bg-green-500";
      case "closed": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Support Tickets</h2>
          <p className="text-muted-foreground">Get help from our support team</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and our team will get back to you
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Provide detailed information about your issue"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Files
                  </Button>
                </div>
                {uploadingFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadingFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Ticket</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No support tickets yet. Create one if you need help!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewTicket(ticket)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {ticket.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <DialogTitle>{selectedTicket.subject}</DialogTitle>
                    <DialogDescription>
                      Ticket #{selectedTicket.id.substring(0, 8)}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{selectedTicket.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Replies
                  </h4>
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg ${
                        reply.is_admin_reply ? "bg-blue-50 dark:bg-blue-950" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={reply.is_admin_reply ? "default" : "secondary"}>
                          {reply.is_admin_reply ? "Support Team" : "You"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-sm">{reply.message}</p>
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {reply.attachments.map((attachment, idx) => (
                            <a
                              key={idx}
                              href={supabase.storage.from('ticket-attachments').getPublicUrl(attachment).data.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline block"
                            >
                              Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== "closed" && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Add Reply</Label>
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={4}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        onChange={handleFileSelect}
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        id="reply-file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("reply-file-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Attach Files
                      </Button>
                      {uploadingFiles.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {uploadingFiles.length} file(s) selected
                        </span>
                      )}
                    </div>
                    {uploadingFiles.length > 0 && (
                      <div className="space-y-2">
                        {uploadingFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button onClick={handleSendReply} disabled={!replyMessage.trim()}>
                      Send Reply
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}