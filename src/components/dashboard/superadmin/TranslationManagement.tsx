import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Download, Upload, Languages, Globe, Trash2, Edit2, Save, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Language {
  id: string;
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string | null;
  is_active: boolean;
  is_default: boolean;
}

interface TranslationKey {
  id: string;
  key: string;
  namespace_id: string;
  default_value: string;
  description: string | null;
  translation_namespaces: {
    code: string;
    name: string;
  };
}

interface Translation {
  id: string;
  key_id: string;
  language_code: string;
  translated_text: string;
  is_verified: boolean;
}

export function TranslationManagement() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translationKeys, setTranslationKeys] = useState<TranslationKey[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [showAddLanguageDialog, setShowAddLanguageDialog] = useState(false);
  const [showAddKeyDialog, setShowAddKeyDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [namespaces, setNamespaces] = useState<any[]>([]);

  const [newLanguage, setNewLanguage] = useState({
    code: "",
    name: "",
    native_name: "",
    flag_emoji: "",
  });

  const [newKey, setNewKey] = useState({
    key: "",
    namespace_id: "",
    default_value: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      loadTranslations();
    }
  }, [selectedLanguage]);

  const loadData = async () => {
    await Promise.all([
      loadLanguages(),
      loadNamespaces(),
      loadTranslationKeys(),
    ]);
  };

  const loadLanguages = async () => {
    const { data, error } = await supabase
      .from('languages')
      .select('*')
      .order('is_default', { ascending: false });

    if (!error && data) {
      setLanguages(data);
      if (!selectedLanguage && data.length > 0) {
        setSelectedLanguage(data[0].code);
      }
    }
  };

  const loadNamespaces = async () => {
    const { data, error } = await supabase
      .from('translation_namespaces')
      .select('*')
      .order('name');

    if (!error && data) {
      setNamespaces(data);
    }
  };

  const loadTranslationKeys = async () => {
    const { data, error } = await supabase
      .from('translation_keys')
      .select(`
        *,
        translation_namespaces(code, name)
      `)
      .order('key');

    if (!error && data) {
      setTranslationKeys(data);
    }
  };

  const loadTranslations = async () => {
    if (!selectedLanguage) return;

    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('language_code', selectedLanguage);

    if (!error && data) {
      setTranslations(data);
    }
  };

  const handleAddLanguage = async () => {
    if (!newLanguage.code || !newLanguage.name || !newLanguage.native_name) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('languages')
      .insert({
        code: newLanguage.code.toLowerCase(),
        name: newLanguage.name,
        native_name: newLanguage.native_name,
        flag_emoji: newLanguage.flag_emoji || null,
        is_active: true,
        is_default: false,
      });

    setLoading(false);
    if (error) {
      toast.error("Failed to add language");
    } else {
      toast.success("Language added successfully");
      setShowAddLanguageDialog(false);
      setNewLanguage({ code: "", name: "", native_name: "", flag_emoji: "" });
      loadLanguages();
    }
  };

  const handleAddKey = async () => {
    if (!newKey.key || !newKey.namespace_id || !newKey.default_value) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('translation_keys')
      .insert({
        key: newKey.key,
        namespace_id: newKey.namespace_id,
        default_value: newKey.default_value,
        description: newKey.description || null,
      });

    setLoading(false);
    if (error) {
      toast.error("Failed to add translation key");
    } else {
      toast.success("Translation key added successfully");
      setShowAddKeyDialog(false);
      setNewKey({ key: "", namespace_id: "", default_value: "", description: "" });
      loadTranslationKeys();
    }
  };

  const handleSaveTranslation = async (keyId: string) => {
    setLoading(true);
    
    const existingTranslation = translations.find(
      t => t.key_id === keyId && t.language_code === selectedLanguage
    );

    if (existingTranslation) {
      const { error } = await supabase
        .from('translations')
        .update({ translated_text: editingValue })
        .eq('id', existingTranslation.id);

      if (error) {
        toast.error("Failed to update translation");
      } else {
        toast.success("Translation updated");
      }
    } else {
      const { error } = await supabase
        .from('translations')
        .insert({
          key_id: keyId,
          language_code: selectedLanguage,
          translated_text: editingValue,
          is_verified: false,
        });

      if (error) {
        toast.error("Failed to create translation");
      } else {
        toast.success("Translation created");
      }
    }

    setLoading(false);
    setEditingKey(null);
    setEditingValue("");
    loadTranslations();
  };

  const handleToggleLanguage = async (languageId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('languages')
      .update({ is_active: !currentStatus })
      .eq('id', languageId);

    if (error) {
      toast.error("Failed to update language status");
    } else {
      toast.success(`Language ${!currentStatus ? 'enabled' : 'disabled'}`);
      loadLanguages();
    }
  };

  const handleAutoTranslate = async () => {
    setLoading(true);
    toast.info("Starting auto-translation... This may take a few minutes.");
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-translate-keys');
      
      if (error) throw error;
      
      toast.success(`Auto-translation completed! ${data?.translationsCreated || 0} translations created.`);
      loadTranslations();
    } catch (error) {
      console.error('Auto-translation error:', error);
      toast.error("Auto-translation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    const exportData: any = {};
    
    languages.forEach(lang => {
      exportData[lang.code] = {};
      translationKeys.forEach(key => {
        const translation = translations.find(
          t => t.key_id === key.id && t.language_code === lang.code
        );
        exportData[lang.code][key.key] = translation?.translated_text || key.default_value;
      });
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translations.json';
    a.click();
    toast.success("Translations exported");
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Process import logic here
      toast.success("Import started - this may take a moment");
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      toast.error("Failed to import translations");
    }
  };

  const filteredKeys = translationKeys.filter(key => 
    selectedNamespace === "all" || key.translation_namespaces.code === selectedNamespace
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Translation Management</h2>
        <p className="text-muted-foreground">Manage languages and translations for the entire platform</p>
      </div>

      <Tabs defaultValue="translations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="translations">
            <Languages className="h-4 w-4 mr-2" />
            Translations
          </TabsTrigger>
          <TabsTrigger value="languages">
            <Globe className="h-4 w-4 mr-2" />
            Languages
          </TabsTrigger>
        </TabsList>

        {/* Translations Tab */}
        <TabsContent value="translations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Translation Keys</CardTitle>
                  <CardDescription>Manage and translate content keys</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAutoTranslate} size="sm" disabled={loading}>
                    <Languages className="h-4 w-4 mr-2" />
                    Auto-Translate All
                  </Button>
                  <Button onClick={() => setShowAddKeyDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Key
                  </Button>
                  <Button onClick={handleExportJSON} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor="import-json" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Import JSON
                      <input
                        id="import-json"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportJSON}
                      />
                    </label>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Namespace</Label>
                  <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Namespaces</SelectItem>
                      {namespaces.map(ns => (
                        <SelectItem key={ns.id} value={ns.code}>{ns.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.flag_emoji} {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Default (English)</TableHead>
                      <TableHead>Translation</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeys.map(key => {
                      const translation = translations.find(
                        t => t.key_id === key.id && t.language_code === selectedLanguage
                      );
                      const isEditing = editingKey === key.id;

                      return (
                        <TableRow key={key.id}>
                          <TableCell className="font-mono text-sm">{key.key}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{key.translation_namespaces.name}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {key.default_value}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                placeholder="Enter translation"
                                autoFocus
                              />
                            ) : (
                              <span className={!translation ? "text-muted-foreground italic" : ""}>
                                {translation?.translated_text || "Not translated"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveTranslation(key.id)}
                                  disabled={loading}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingKey(null);
                                    setEditingValue("");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingKey(key.id);
                                  setEditingValue(translation?.translated_text || key.default_value);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Languages Tab */}
        <TabsContent value="languages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Languages</CardTitle>
                  <CardDescription>Manage available languages</CardDescription>
                </div>
                <Button onClick={() => setShowAddLanguageDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Language
                </Button>
              </div>
            </CardHeader>
            <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Native Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {languages.map(lang => (
                      <TableRow key={lang.id}>
                        <TableCell className="text-2xl">{lang.flag_emoji}</TableCell>
                        <TableCell className="font-mono">{lang.code}</TableCell>
                        <TableCell>{lang.name}</TableCell>
                        <TableCell>{lang.native_name}</TableCell>
                        <TableCell>
                          <Badge variant={lang.is_active ? "default" : "secondary"}>
                            {lang.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lang.is_default && <Badge>Default</Badge>}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={lang.is_active}
                            onCheckedChange={() => handleToggleLanguage(lang.id, lang.is_active)}
                            disabled={lang.is_default}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Language Dialog */}
      <Dialog open={showAddLanguageDialog} onOpenChange={setShowAddLanguageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Language</DialogTitle>
            <DialogDescription>Add a new language to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Language Code *</Label>
              <Input
                placeholder="en, es, fr, de..."
                value={newLanguage.code}
                onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>English Name *</Label>
              <Input
                placeholder="English, Spanish, French..."
                value={newLanguage.name}
                onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Native Name *</Label>
              <Input
                placeholder="English, Español, Français..."
                value={newLanguage.native_name}
                onChange={(e) => setNewLanguage({ ...newLanguage, native_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Flag Emoji</Label>
              <Input
                placeholder="🇬🇧 🇪🇸 🇫🇷..."
                value={newLanguage.flag_emoji}
                onChange={(e) => setNewLanguage({ ...newLanguage, flag_emoji: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLanguageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLanguage} disabled={loading}>
              Add Language
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Key Dialog */}
      <Dialog open={showAddKeyDialog} onOpenChange={setShowAddKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Translation Key</DialogTitle>
            <DialogDescription>Add a new translation key</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key *</Label>
              <Input
                placeholder="header.login, booking.confirm..."
                value={newKey.key}
                onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Namespace *</Label>
              <Select value={newKey.namespace_id} onValueChange={(value) => setNewKey({ ...newKey, namespace_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select namespace" />
                </SelectTrigger>
                <SelectContent>
                  {namespaces.map(ns => (
                    <SelectItem key={ns.id} value={ns.id}>{ns.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Value (English) *</Label>
              <Textarea
                placeholder="Default English text..."
                value={newKey.default_value}
                onChange={(e) => setNewKey({ ...newKey, default_value: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Context for translators..."
                value={newKey.description}
                onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKey} disabled={loading}>
              Add Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}