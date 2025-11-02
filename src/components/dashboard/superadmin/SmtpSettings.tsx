import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, Send } from "lucide-react";

interface SmtpSettings {
  id?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
}

const SmtpSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [settings, setSettings] = useState<SmtpSettings>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: 'Hotel Management System',
    is_active: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching SMTP settings:', error);
      toast.error('Failed to load SMTP settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('smtp_settings')
          .update({
            host: settings.host,
            port: settings.port,
            username: settings.username,
            password: settings.password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            is_active: settings.is_active
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert({
            host: settings.host,
            port: settings.port,
            username: settings.username,
            password: settings.password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            is_active: settings.is_active
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setSettings(data);
      }

      toast.success('SMTP settings saved successfully');
    } catch (error: any) {
      console.error('Error saving SMTP settings:', error);
      toast.error('Failed to save SMTP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    if (!settings.host || !settings.username || !settings.password || !settings.from_email) {
      toast.error('Please fill in all SMTP settings before testing');
      return;
    }

    setTesting(true);
    try {
      // First, temporarily save settings if needed
      if (!settings.id) {
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert({
            host: settings.host,
            port: settings.port,
            username: settings.username,
            password: settings.password,
            from_email: settings.from_email,
            from_name: settings.from_name,
            is_active: false // Temporarily inactive for testing
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setSettings(data);
      }

      // Send test email
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          hotel_id: '00000000-0000-0000-0000-000000000000', // Dummy hotel ID for test
          recipient_email: testEmail,
          subject: 'SMTP Test Email',
          html_content: `
            <h2>SMTP Configuration Test</h2>
            <p>This is a test email to verify your SMTP settings are working correctly.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>Host: ${settings.host}</li>
              <li>Port: ${settings.port}</li>
              <li>From: ${settings.from_name} &lt;${settings.from_email}&gt;</li>
            </ul>
            <p>If you received this email, your SMTP configuration is working properly!</p>
          `,
          email_type: 'test'
        }
      });

      if (error) {
        console.error('Test email error:', error);
        const errorMsg = typeof error === 'object' && error.error 
          ? error.error 
          : 'Failed to send test email. Please check your SMTP settings.';
        toast.error(errorMsg, { duration: 6000 });
      } else {
        toast.success(`Test email sent successfully to ${testEmail}!`);
        setTestEmail('');
      }
    } catch (error: any) {
      console.error('Error testing SMTP connection:', error);
      toast.error('Failed to test SMTP connection');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>SMTP Email Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure SMTP settings to enable automated email notifications
        </CardDescription>
        <div className="mt-2 p-3 bg-muted rounded-md text-sm">
          <p className="font-medium mb-1">Important for Gmail users:</p>
          <p className="text-muted-foreground">
            You must use an App Password instead of your regular password. 
            <a 
              href="https://support.google.com/accounts/answer/185833" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              Learn how to create one →
            </a>
          </p>
          <p className="text-muted-foreground mt-2">
            <strong>Settings for Gmail:</strong> Host: smtp.gmail.com, Port: 587
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Host</Label>
            <Input
              id="host"
              placeholder="smtp.gmail.com"
              value={settings.host}
              onChange={(e) => setSettings({ ...settings, host: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">SMTP Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="587"
              value={settings.port}
              onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 587 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="your-email@gmail.com"
              value={settings.username}
              onChange={(e) => setSettings({ ...settings, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password (App Password for Gmail)</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={settings.password}
              onChange={(e) => setSettings({ ...settings, password: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              For Gmail: Use an App Password, not your account password
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from_email">From Email</Label>
            <Input
              id="from_email"
              type="email"
              placeholder="noreply@yourdomain.com"
              value={settings.from_email}
              onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="from_name">From Name</Label>
            <Input
              id="from_name"
              placeholder="Hotel Management System"
              value={settings.from_name}
              onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={settings.is_active}
            onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
          />
          <Label htmlFor="is_active">Enable email notifications</Label>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Test Connection</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Send a test email to verify your SMTP configuration is working correctly
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleTestConnection} 
                disabled={testing}
                variant="outline"
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmtpSettings;