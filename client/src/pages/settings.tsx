import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  RefreshCw,
  Shield,
  Image,
  Globe,
  Megaphone,
  Save,
  Brain,
  Share2,
  Search,
  Database,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Pencil
} from "lucide-react";
import { SiTumblr } from "react-icons/si";
import type { AppSettings, ApiKey, BloggerAccount } from "@shared/schema";

interface CredentialsResponse {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  blog_id: string;
  has_client_id?: boolean;
  has_client_secret?: boolean;
  has_refresh_token?: boolean;
  has_blog_id?: boolean;
}

interface TumblrCredentialsResponse {
  consumer_key: string;
  consumer_secret: string;
  token: string;
  token_secret: string;
  has_consumer_key?: boolean;
  has_consumer_secret?: boolean;
  has_token?: boolean;
  has_token_secret?: boolean;
}

interface SupabaseConfigResponse {
  projectUrl: string;
  serviceRoleKey: string;
  isConfigured: boolean;
  configuredAt?: string;
  hasServiceRoleKey: boolean;
}

interface SupabaseKeyResponse {
  id: string;
  keyType: string;
  keyName?: string;
  maskedKey: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [newCerebrasKey, setNewCerebrasKey] = useState("");
  const [newCerebrasKeyName, setNewCerebrasKeyName] = useState("");
  const [newImgbbKey, setNewImgbbKey] = useState("");
  const [newImgbbKeyName, setNewImgbbKeyName] = useState("");
  const [newFreeImageHostKey, setNewFreeImageHostKey] = useState("");
  const [newFreeImageHostKeyName, setNewFreeImageHostKeyName] = useState("");
  const [newSerperKey, setNewSerperKey] = useState("");
  const [newSerperKeyName, setNewSerperKeyName] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [blogId, setBlogId] = useState("");
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [bannerAdsCode, setBannerAdsCode] = useState("");
  const [popunderAdsCode, setPopunderAdsCode] = useState("");
  const [adverticaBannerAdsCode, setAdverticaBannerAdsCode] = useState("");
  
  const [tumblrConsumerKey, setTumblrConsumerKey] = useState("");
  const [tumblrConsumerSecret, setTumblrConsumerSecret] = useState("");
  const [tumblrToken, setTumblrToken] = useState("");
  const [tumblrTokenSecret, setTumblrTokenSecret] = useState("");

  const [supabaseProjectUrl, setSupabaseProjectUrl] = useState("");
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState("");
  
  const [editingSupabaseKey, setEditingSupabaseKey] = useState<SupabaseKeyResponse | null>(null);
  const [editSupabaseKeyValue, setEditSupabaseKeyValue] = useState("");
  const [editSupabaseKeyName, setEditSupabaseKeyName] = useState("");
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: supabaseConfig, isLoading: supabaseConfigLoading } = useQuery<SupabaseConfigResponse>({
    queryKey: ["/api/supabase/config"],
  });

  const { data: supabaseKeys, isLoading: supabaseKeysLoading, refetch: refetchSupabaseKeys } = useQuery<{ success: boolean; keys?: SupabaseKeyResponse[] }>({
    queryKey: ["/api/supabase/keys"],
    enabled: !!supabaseConfig?.isConfigured,
  });

  const { data: credentials, isLoading: credentialsLoading } = useQuery<CredentialsResponse>({
    queryKey: ["/api/admin/credentials"],
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<BloggerAccount[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: tumblrCredentials, isLoading: tumblrCredentialsLoading } = useQuery<TumblrCredentialsResponse>({
    queryKey: ["/api/tumblr/credentials"],
  });

  const addCerebrasKey = useMutation({
    mutationFn: async ({ key, name }: { key: string; name?: string }) => {
      return apiRequest("POST", "/api/settings/cerebras-keys", { key, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Cerebras API key added successfully" });
      setNewCerebrasKey("");
      setNewCerebrasKeyName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add key", description: error.message, variant: "destructive" });
    },
  });

  const removeCerebrasKey = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/cerebras-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "API key removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove key", description: error.message, variant: "destructive" });
    },
  });

  const addImgbbKey = useMutation({
    mutationFn: async ({ key, name }: { key: string; name?: string }) => {
      return apiRequest("POST", "/api/settings/imgbb-keys", { key, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "ImgBB API key added successfully" });
      setNewImgbbKey("");
      setNewImgbbKeyName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add key", description: error.message, variant: "destructive" });
    },
  });

  const removeImgbbKey = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/imgbb-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "API key removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove key", description: error.message, variant: "destructive" });
    },
  });

  const addFreeImageHostKey = useMutation({
    mutationFn: async ({ key, name }: { key: string; name?: string }) => {
      return apiRequest("POST", "/api/settings/freeimagehost-keys", { key, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "FreeImage.host API key added successfully" });
      setNewFreeImageHostKey("");
      setNewFreeImageHostKeyName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add key", description: error.message, variant: "destructive" });
    },
  });

  const removeFreeImageHostKey = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/freeimagehost-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "API key removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove key", description: error.message, variant: "destructive" });
    },
  });

  const addSerperKey = useMutation({
    mutationFn: async ({ key, name }: { key: string; name?: string }) => {
      return apiRequest("POST", "/api/settings/serper-keys", { key, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Serper API key added successfully" });
      setNewSerperKey("");
      setNewSerperKeyName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add key", description: error.message, variant: "destructive" });
    },
  });

  const removeSerperKey = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/serper-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "API key removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove key", description: error.message, variant: "destructive" });
    },
  });

  const testSerper = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test/serper");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const saveCredentials = useMutation({
    mutationFn: async (creds: { client_id: string; client_secret: string; refresh_token: string; blog_id: string }) => {
      return apiRequest("POST", "/api/admin/credentials", creds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credentials"] });
      toast({ title: "Credentials saved successfully" });
      setClientId("");
      setClientSecret("");
      setRefreshToken("");
      setBlogId("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save credentials", description: error.message, variant: "destructive" });
    },
  });

  const testCerebras = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test/cerebras");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const testImageGenerator = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test/image-generator");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const testImgbb = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test/imgbb");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const testFreeImageHost = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test/freeimagehost");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const saveAdSettings = useMutation({
    mutationFn: async ({ accountId, bannerAdsCode, popunderAdsCode, adverticaBannerAdsCode }: { accountId: string; bannerAdsCode: string; popunderAdsCode: string; adverticaBannerAdsCode: string }) => {
      return apiRequest("PATCH", `/api/accounts/${accountId}`, { bannerAdsCode, popunderAdsCode, adverticaBannerAdsCode });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setBannerAdsCode(variables.bannerAdsCode);
      setPopunderAdsCode(variables.popunderAdsCode);
      setAdverticaBannerAdsCode(variables.adverticaBannerAdsCode);
      toast({ title: "Ad settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save ad settings", description: error.message, variant: "destructive" });
    },
  });

  const saveTumblrCredentials = useMutation({
    mutationFn: async (creds: { consumer_key: string; consumer_secret: string; token: string; token_secret: string }) => {
      return apiRequest("POST", "/api/tumblr/credentials", creds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tumblr/credentials"] });
      toast({ title: "Tumblr credentials saved successfully" });
      setTumblrConsumerKey("");
      setTumblrConsumerSecret("");
      setTumblrToken("");
      setTumblrTokenSecret("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save Tumblr credentials", description: error.message, variant: "destructive" });
    },
  });

  const testTumblr = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test/tumblr");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const saveSupabaseConfig = useMutation({
    mutationFn: async ({ projectUrl, serviceRoleKey }: { projectUrl: string; serviceRoleKey: string }) => {
      return apiRequest("POST", "/api/supabase/config", { projectUrl, serviceRoleKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supabase/config"] });
      toast({ title: "Supabase configuration saved successfully" });
      setSupabaseServiceRoleKey("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save Supabase config", description: error.message, variant: "destructive" });
    },
  });

  const testSupabase = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/supabase/test");
    },
    onSuccess: (data: any) => {
      if (data.warning) {
        toast({ 
          title: "Connection successful with warning",
          description: data.warning,
          variant: "default"
        });
      } else {
        toast({ 
          title: data.success ? "Connection successful" : "Connection failed",
          description: data.message,
          variant: data.success ? "default" : "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Connection test failed", description: error.message, variant: "destructive" });
    },
  });

  const migrateToSupabase = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/supabase/migrate");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/supabase/keys"] });
      toast({ 
        title: data.success ? "Migration successful" : "Migration completed with issues",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({ title: "Migration failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteSupabaseKey = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/supabase/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supabase/keys"] });
      toast({ title: "Key deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete key", description: error.message, variant: "destructive" });
    },
  });

  const updateSupabaseKey = useMutation({
    mutationFn: async ({ id, key, keyName }: { id: string; key?: string; keyName?: string }) => {
      return apiRequest("PATCH", `/api/supabase/keys/${id}`, { key, keyName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supabase/keys"] });
      toast({ title: "Key updated successfully" });
      setEditingSupabaseKey(null);
      setEditSupabaseKeyValue("");
      setEditSupabaseKeyName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update key", description: error.message, variant: "destructive" });
    },
  });

  const handleEditSupabaseKey = (key: SupabaseKeyResponse) => {
    setEditingSupabaseKey(key);
    setEditSupabaseKeyName(key.keyName || "");
    setEditSupabaseKeyValue("");
  };

  const handleSaveSupabaseKeyEdit = () => {
    if (!editingSupabaseKey) return;
    
    const updates: { id: string; key?: string; keyName?: string } = { id: editingSupabaseKey.id };
    const hasKeyChange = editSupabaseKeyValue.trim().length > 0;
    const hasNameChange = editSupabaseKeyName.trim() !== (editingSupabaseKey.keyName || "");
    
    if (hasKeyChange) {
      updates.key = editSupabaseKeyValue.trim();
    }
    if (hasNameChange) {
      updates.keyName = editSupabaseKeyName.trim();
    }
    
    if (!hasKeyChange && !hasNameChange) {
      toast({ title: "No changes to save", variant: "default" });
      return;
    }
    
    updateSupabaseKey.mutate(updates);
  };

  const handleSaveSupabaseConfig = () => {
    if (!supabaseProjectUrl.trim()) {
      toast({ title: "Please enter Supabase Project URL", variant: "destructive" });
      return;
    }
    saveSupabaseConfig.mutate({
      projectUrl: supabaseProjectUrl.trim(),
      serviceRoleKey: supabaseServiceRoleKey.trim(),
    });
  };

  const handleSelectAccount = (account: BloggerAccount) => {
    setSelectedAccountId(account.id);
    setBannerAdsCode(account.bannerAdsCode || "");
    setPopunderAdsCode(account.popunderAdsCode || "");
    setAdverticaBannerAdsCode(account.adverticaBannerAdsCode || "");
  };

  const handleSaveAdSettings = () => {
    if (!selectedAccountId) {
      toast({ title: "Please select an account first", variant: "destructive" });
      return;
    }
    saveAdSettings.mutate({
      accountId: selectedAccountId,
      bannerAdsCode: bannerAdsCode.trim(),
      popunderAdsCode: popunderAdsCode.trim(),
      adverticaBannerAdsCode: adverticaBannerAdsCode.trim(),
    });
  };

  const handleAddCerebrasKey = () => {
    if (!newCerebrasKey.trim()) {
      toast({ title: "Please enter an API key", variant: "destructive" });
      return;
    }
    addCerebrasKey.mutate({ key: newCerebrasKey.trim(), name: newCerebrasKeyName.trim() || undefined });
  };

  const handleAddImgbbKey = () => {
    if (!newImgbbKey.trim()) {
      toast({ title: "Please enter an API key", variant: "destructive" });
      return;
    }
    addImgbbKey.mutate({ key: newImgbbKey.trim(), name: newImgbbKeyName.trim() || undefined });
  };

  const handleAddFreeImageHostKey = () => {
    if (!newFreeImageHostKey.trim()) {
      toast({ title: "Please enter an API key", variant: "destructive" });
      return;
    }
    addFreeImageHostKey.mutate({ key: newFreeImageHostKey.trim(), name: newFreeImageHostKeyName.trim() || undefined });
  };

  const handleAddSerperKey = () => {
    if (!newSerperKey.trim()) {
      toast({ title: "Please enter an API key", variant: "destructive" });
      return;
    }
    addSerperKey.mutate({ key: newSerperKey.trim(), name: newSerperKeyName.trim() || undefined });
  };

  const handleSaveCredentials = () => {
    saveCredentials.mutate({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      blog_id: blogId,
    });
  };

  const handleSaveTumblrCredentials = () => {
    saveTumblrCredentials.mutate({
      consumer_key: tumblrConsumerKey,
      consumer_secret: tumblrConsumerSecret,
      token: tumblrToken,
      token_secret: tumblrTokenSecret,
    });
  };

  if (settingsLoading || credentialsLoading || accountsLoading || tumblrCredentialsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectedAccounts = accounts?.filter(acc => acc.isConnected) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">
          Manage your API keys, OAuth credentials, and system configuration
        </p>
      </div>

      <Tabs defaultValue="supabase" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="supabase" data-testid="tab-supabase">
            <Database className="h-4 w-4 mr-2" />
            Supabase
          </TabsTrigger>
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="oauth" data-testid="tab-oauth">
            <Shield className="h-4 w-4 mr-2" />
            Blogger OAuth
          </TabsTrigger>
          <TabsTrigger value="tumblr" data-testid="tab-tumblr">
            <SiTumblr className="h-4 w-4 mr-2" />
            Tumblr
          </TabsTrigger>
          <TabsTrigger value="ads" data-testid="tab-ads">
            <Megaphone className="h-4 w-4 mr-2" />
            Ads Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supabase" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Supabase Configuration</CardTitle>
                    <CardDescription>Store API keys securely in your Supabase database</CardDescription>
                  </div>
                </div>
                {supabaseConfig?.isConfigured ? (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Security Notice</p>
                    <p className="text-sm text-muted-foreground">
                      The Service Role Key grants full access to your Supabase database. Never expose this key in frontend code or network requests. 
                      It is encrypted before storage and only used server-side.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supabase-url">Supabase Project URL</Label>
                  <Input
                    id="supabase-url"
                    placeholder={supabaseConfig?.projectUrl || "https://your-project.supabase.co"}
                    value={supabaseProjectUrl}
                    onChange={(e) => setSupabaseProjectUrl(e.target.value)}
                    data-testid="input-supabase-url"
                  />
                  {supabaseConfig?.projectUrl && !supabaseProjectUrl && (
                    <p className="text-xs text-muted-foreground">Current: {supabaseConfig.projectUrl}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supabase-key">Service Role Key (Secret)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="supabase-key"
                        type={showSupabaseKey ? "text" : "password"}
                        placeholder={supabaseConfig?.hasServiceRoleKey ? "Key configured (enter new to update)" : "Enter your service role key"}
                        value={supabaseServiceRoleKey}
                        onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
                        data-testid="input-supabase-key"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                      data-testid="button-toggle-supabase-key"
                    >
                      {showSupabaseKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {supabaseConfig?.hasServiceRoleKey && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Service role key is configured and encrypted
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveSupabaseConfig}
                  disabled={saveSupabaseConfig.isPending || (!supabaseProjectUrl && !supabaseServiceRoleKey)}
                  data-testid="button-save-supabase-config"
                >
                  {saveSupabaseConfig.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testSupabase.mutate()}
                  disabled={testSupabase.isPending || !supabaseConfig?.isConfigured}
                  data-testid="button-test-supabase"
                >
                  {testSupabase.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {supabaseConfig?.isConfigured && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Migrate API Keys</CardTitle>
                        <CardDescription>Transfer existing API keys to Supabase for secure storage</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                    <p className="text-sm text-muted-foreground">
                      This will copy all your existing API keys (Cerebras, Gemini, ImgBB, FreeImage.host, Serper, Blogger, Tumblr, WhatsApp) 
                      to your Supabase database with encryption. Original keys will remain until you manually remove them.
                    </p>
                  </div>

                  <Button
                    onClick={() => migrateToSupabase.mutate()}
                    disabled={migrateToSupabase.isPending}
                    data-testid="button-migrate-keys"
                  >
                    {migrateToSupabase.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Migrate All Keys to Supabase
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                        <Key className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Stored API Keys</CardTitle>
                        <CardDescription>API keys stored securely in Supabase</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {supabaseKeys?.keys?.length || 0} keys
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {supabaseKeysLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : supabaseKeys?.keys && supabaseKeys.keys.length > 0 ? (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-2">
                        {supabaseKeys.keys.map((key, index) => (
                          <div 
                            key={key.id} 
                            className="p-3 rounded-md bg-muted/50 space-y-3"
                            data-testid={`supabase-key-${index}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <Badge variant="outline" className="text-xs">{key.keyType}</Badge>
                                <span className="text-sm font-mono truncate">{key.maskedKey}</span>
                                {key.keyName && <span className="text-xs text-muted-foreground">({key.keyName})</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditSupabaseKey(key)}
                                  data-testid={`button-edit-supabase-key-${index}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteSupabaseKey.mutate(key.id)}
                                  data-testid={`button-delete-supabase-key-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            {editingSupabaseKey?.id === key.id && (
                              <div className="space-y-3 pt-2 border-t">
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-key-name-${index}`}>Key Name (optional)</Label>
                                  <Input
                                    id={`edit-key-name-${index}`}
                                    placeholder="e.g., Production Key"
                                    value={editSupabaseKeyName}
                                    onChange={(e) => setEditSupabaseKeyName(e.target.value)}
                                    data-testid={`input-edit-supabase-key-name-${index}`}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-key-value-${index}`}>New Key Value (leave empty to keep current)</Label>
                                  <Input
                                    id={`edit-key-value-${index}`}
                                    type="password"
                                    placeholder="Enter new key value to update"
                                    value={editSupabaseKeyValue}
                                    onChange={(e) => setEditSupabaseKeyValue(e.target.value)}
                                    data-testid={`input-edit-supabase-key-value-${index}`}
                                  />
                                  <p className="text-xs text-muted-foreground">The key will be encrypted before storage</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={handleSaveSupabaseKeyEdit}
                                    disabled={updateSupabaseKey.isPending}
                                    data-testid={`button-save-supabase-key-${index}`}
                                  >
                                    {updateSupabaseKey.isPending ? (
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Changes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingSupabaseKey(null);
                                      setEditSupabaseKeyValue("");
                                      setEditSupabaseKeyName("");
                                    }}
                                    data-testid={`button-cancel-edit-supabase-key-${index}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No keys stored in Supabase yet</p>
                      <p className="text-xs">Use the migrate button above to transfer existing keys</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Database Setup Required</CardTitle>
                      <CardDescription>Create the api_keys table in Supabase</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Run this SQL in your Supabase SQL Editor to create the required table:
                  </p>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type TEXT NOT NULL,
  key_name TEXT,
  encrypted_key TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only
CREATE POLICY "Service role access only" ON api_keys
  FOR ALL
  USING (auth.role() = 'service_role');`}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Cerebras AI</CardTitle>
                      <CardDescription>For content generation (Llama 3.3 70B)</CardDescription>
                    </div>
                  </div>
                  <Badge variant={settings?.cerebrasApiKeys?.length ? "secondary" : "outline"}>
                    {settings?.cerebrasApiKeys?.length || 0} keys
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings?.cerebrasApiKeys && settings.cerebrasApiKeys.length > 0 && (
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {settings.cerebrasApiKeys.map((key, index) => (
                        <div 
                          key={key.id} 
                          className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`cerebras-key-${index}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                            <span className="text-sm font-mono truncate">{key.key}</span>
                            {key.name && <span className="text-xs text-muted-foreground">({key.name})</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCerebrasKey.mutate(key.id)}
                            data-testid={`button-remove-cerebras-key-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="cerebras-key-name">Key Name (optional)</Label>
                    <Input
                      id="cerebras-key-name"
                      placeholder="e.g., Production Key"
                      value={newCerebrasKeyName}
                      onChange={(e) => setNewCerebrasKeyName(e.target.value)}
                      data-testid="input-cerebras-key-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cerebras-key">API Key</Label>
                    <Input
                      id="cerebras-key"
                      type="password"
                      placeholder="Enter Cerebras API key"
                      value={newCerebrasKey}
                      onChange={(e) => setNewCerebrasKey(e.target.value)}
                      data-testid="input-cerebras-key"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddCerebrasKey}
                      disabled={addCerebrasKey.isPending}
                      className="flex-1"
                      data-testid="button-add-cerebras-key"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => testCerebras.mutate()}
                      disabled={testCerebras.isPending || !settings?.cerebrasApiKeys?.length}
                      data-testid="button-test-cerebras"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${testCerebras.isPending ? "animate-spin" : ""}`} />
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                      <Image className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Image Generator</CardTitle>
                      <CardDescription>Powered by Pollinations AI</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    Free
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">100% Free - No API Key Required</p>
                      <p className="text-xs text-muted-foreground">
                        Images are generated using Pollinations AI, a free and open-source service. 
                        No registration or API keys needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Unlimited image generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>High-quality cinematic thumbnails</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>FOMO-inducing cover images</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>No watermarks</span>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  onClick={() => testImageGenerator.mutate()}
                  disabled={testImageGenerator.isPending}
                  className="w-full"
                  data-testid="button-test-image-generator"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${testImageGenerator.isPending ? "animate-spin" : ""}`} />
                  Test Connection
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                      <Image className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">ImgBB</CardTitle>
                      <CardDescription>For image hosting</CardDescription>
                    </div>
                  </div>
                  <Badge variant={settings?.imgbbApiKeys?.length ? "secondary" : "outline"}>
                    {settings?.imgbbApiKeys?.length || 0} keys
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings?.imgbbApiKeys && settings.imgbbApiKeys.length > 0 && (
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {settings.imgbbApiKeys.map((key, index) => (
                        <div 
                          key={key.id} 
                          className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`imgbb-key-${index}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                            <span className="text-sm font-mono truncate">{key.key}</span>
                            {key.name && <span className="text-xs text-muted-foreground">({key.name})</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeImgbbKey.mutate(key.id)}
                            data-testid={`button-remove-imgbb-key-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="imgbb-key-name">Key Name (optional)</Label>
                    <Input
                      id="imgbb-key-name"
                      placeholder="e.g., Primary Key"
                      value={newImgbbKeyName}
                      onChange={(e) => setNewImgbbKeyName(e.target.value)}
                      data-testid="input-imgbb-key-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imgbb-key">API Key</Label>
                    <Input
                      id="imgbb-key"
                      type="password"
                      placeholder="Enter ImgBB API key"
                      value={newImgbbKey}
                      onChange={(e) => setNewImgbbKey(e.target.value)}
                      data-testid="input-imgbb-key"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddImgbbKey}
                      disabled={addImgbbKey.isPending}
                      className="flex-1"
                      data-testid="button-add-imgbb-key"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => testImgbb.mutate()}
                      disabled={testImgbb.isPending || !settings?.imgbbApiKeys?.length}
                      data-testid="button-test-imgbb"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${testImgbb.isPending ? "animate-spin" : ""}`} />
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                      <Image className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">FreeImage.host</CardTitle>
                      <CardDescription>Primary image hosting (recommended)</CardDescription>
                    </div>
                  </div>
                  <Badge variant={settings?.freeImageHostApiKeys?.length ? "secondary" : "outline"}>
                    {settings?.freeImageHostApiKeys?.length || 0} keys
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Image className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Reliable Image Hosting for Blogger</p>
                      <p className="text-xs text-muted-foreground">
                        FreeImage.host is preferred for Blogger as images display permanently without issues.
                        Get your free API key at freeimage.host/page/api
                      </p>
                    </div>
                  </div>
                </div>

                {settings?.freeImageHostApiKeys && settings.freeImageHostApiKeys.length > 0 && (
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {settings.freeImageHostApiKeys.map((key, index) => (
                        <div 
                          key={key.id} 
                          className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`freeimagehost-key-${index}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="text-sm font-mono truncate">{key.key}</span>
                            {key.name && <span className="text-xs text-muted-foreground">({key.name})</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFreeImageHostKey.mutate(key.id)}
                            data-testid={`button-remove-freeimagehost-key-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="freeimagehost-key-name">Key Name (optional)</Label>
                    <Input
                      id="freeimagehost-key-name"
                      placeholder="e.g., Primary Key"
                      value={newFreeImageHostKeyName}
                      onChange={(e) => setNewFreeImageHostKeyName(e.target.value)}
                      data-testid="input-freeimagehost-key-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freeimagehost-key">API Key</Label>
                    <Input
                      id="freeimagehost-key"
                      type="password"
                      placeholder="Enter FreeImage.host API key"
                      value={newFreeImageHostKey}
                      onChange={(e) => setNewFreeImageHostKey(e.target.value)}
                      data-testid="input-freeimagehost-key"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddFreeImageHostKey}
                      disabled={addFreeImageHostKey.isPending}
                      className="flex-1"
                      data-testid="button-add-freeimagehost-key"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => testFreeImageHost.mutate()}
                      disabled={testFreeImageHost.isPending || !settings?.freeImageHostApiKeys?.length}
                      data-testid="button-test-freeimagehost"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${testFreeImageHost.isPending ? "animate-spin" : ""}`} />
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <Search className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Serper.dev</CardTitle>
                      <CardDescription>For AI web research (trending topics)</CardDescription>
                    </div>
                  </div>
                  <Badge variant={settings?.serperApiKeys?.length ? "secondary" : "outline"}>
                    {settings?.serperApiKeys?.length || 0} keys
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Search className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Web Research for Trending Topics</p>
                      <p className="text-xs text-muted-foreground">
                        Serper.dev is used exclusively for researching trending topics. 
                        Add unlimited API keys - they rotate automatically per request. 
                        Failed keys are skipped automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {settings?.serperApiKeys && settings.serperApiKeys.length > 0 && (
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {settings.serperApiKeys.map((key, index) => (
                        <div 
                          key={key.id} 
                          className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`serper-key-${index}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                            <span className="text-sm font-mono truncate">{key.key}</span>
                            {key.name && <span className="text-xs text-muted-foreground">({key.name})</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSerperKey.mutate(key.id)}
                            data-testid={`button-remove-serper-key-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="serper-key-name">Key Name (optional)</Label>
                    <Input
                      id="serper-key-name"
                      placeholder="e.g., Primary Key"
                      value={newSerperKeyName}
                      onChange={(e) => setNewSerperKeyName(e.target.value)}
                      data-testid="input-serper-key-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serper-key">API Key</Label>
                    <Input
                      id="serper-key"
                      type="password"
                      placeholder="Enter Serper.dev API key"
                      value={newSerperKey}
                      onChange={(e) => setNewSerperKey(e.target.value)}
                      data-testid="input-serper-key"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddSerperKey}
                      disabled={addSerperKey.isPending}
                      className="flex-1"
                      data-testid="button-add-serper-key"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => testSerper.mutate()}
                      disabled={testSerper.isPending || !settings?.serperApiKeys?.length}
                      data-testid="button-test-serper"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${testSerper.isPending ? "animate-spin" : ""}`} />
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="oauth" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Blogger OAuth Credentials</CardTitle>
                  <CardDescription>
                    Global credentials used for all Blogger account connections
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {credentials?.has_client_id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Client ID</span>
                </div>
                <div className="flex items-center gap-2">
                  {credentials?.has_client_secret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Client Secret</span>
                </div>
                <div className="flex items-center gap-2">
                  {credentials?.has_refresh_token ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Refresh Token</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCredentials(!showCredentials)}
                  data-testid="button-toggle-credentials"
                >
                  {showCredentials ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showCredentials ? "Hide" : "Edit"}
                </Button>
              </div>

              {showCredentials && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-id">Client ID</Label>
                      <Input
                        id="client-id"
                        placeholder={credentials?.has_client_id ? "Leave blank to keep existing" : "Enter Client ID"}
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        data-testid="input-client-id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-secret">Client Secret</Label>
                      <Input
                        id="client-secret"
                        type="password"
                        placeholder={credentials?.has_client_secret ? "Leave blank to keep existing" : "Enter Client Secret"}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        data-testid="input-client-secret"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="refresh-token">Refresh Token</Label>
                      <Input
                        id="refresh-token"
                        type="password"
                        placeholder={credentials?.has_refresh_token ? "Leave blank to keep existing" : "Enter Refresh Token"}
                        value={refreshToken}
                        onChange={(e) => setRefreshToken(e.target.value)}
                        data-testid="input-refresh-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-blog-id">Default Blog ID</Label>
                      <Input
                        id="default-blog-id"
                        placeholder={credentials?.blog_id || "Enter default Blog ID"}
                        value={blogId}
                        onChange={(e) => setBlogId(e.target.value)}
                        data-testid="input-blog-id"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSaveCredentials}
                    disabled={saveCredentials.isPending}
                    data-testid="button-save-credentials"
                  >
                    {saveCredentials.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save Credentials
                  </Button>
                </div>
              )}

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium mb-2">How to get OAuth credentials:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Google Cloud Console</li>
                  <li>Create a project and enable Blogger API</li>
                  <li>Create OAuth 2.0 credentials</li>
                  <li>Generate a refresh token using OAuth Playground</li>
                  <li>Enter the credentials above</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tumblr" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <SiTumblr className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tumblr API Credentials</CardTitle>
                  <CardDescription>
                    Configure your Tumblr OAuth credentials to enable automatic cross-posting
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {tumblrCredentials?.has_consumer_key ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Consumer Key</span>
                </div>
                <div className="flex items-center gap-2">
                  {tumblrCredentials?.has_consumer_secret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Consumer Secret</span>
                </div>
                <div className="flex items-center gap-2">
                  {tumblrCredentials?.has_token ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Token</span>
                </div>
                <div className="flex items-center gap-2">
                  {tumblrCredentials?.has_token_secret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Token Secret</span>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => testTumblr.mutate()}
                  disabled={testTumblr.isPending || !tumblrCredentials?.has_consumer_key}
                  data-testid="button-test-tumblr"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${testTumblr.isPending ? "animate-spin" : ""}`} />
                  Test Connection
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tumblr-consumer-key">OAuth Consumer Key</Label>
                    <Input
                      id="tumblr-consumer-key"
                      type="password"
                      placeholder={tumblrCredentials?.has_consumer_key ? "Leave blank to keep existing" : "Enter Consumer Key"}
                      value={tumblrConsumerKey}
                      onChange={(e) => setTumblrConsumerKey(e.target.value)}
                      data-testid="input-tumblr-consumer-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tumblr-consumer-secret">OAuth Consumer Secret</Label>
                    <Input
                      id="tumblr-consumer-secret"
                      type="password"
                      placeholder={tumblrCredentials?.has_consumer_secret ? "Leave blank to keep existing" : "Enter Consumer Secret"}
                      value={tumblrConsumerSecret}
                      onChange={(e) => setTumblrConsumerSecret(e.target.value)}
                      data-testid="input-tumblr-consumer-secret"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tumblr-token">Token</Label>
                    <Input
                      id="tumblr-token"
                      type="password"
                      placeholder={tumblrCredentials?.has_token ? "Leave blank to keep existing" : "Enter Token"}
                      value={tumblrToken}
                      onChange={(e) => setTumblrToken(e.target.value)}
                      data-testid="input-tumblr-token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tumblr-token-secret">Token Secret</Label>
                    <Input
                      id="tumblr-token-secret"
                      type="password"
                      placeholder={tumblrCredentials?.has_token_secret ? "Leave blank to keep existing" : "Enter Token Secret"}
                      value={tumblrTokenSecret}
                      onChange={(e) => setTumblrTokenSecret(e.target.value)}
                      data-testid="input-tumblr-token-secret"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveTumblrCredentials}
                  disabled={saveTumblrCredentials.isPending}
                  data-testid="button-save-tumblr-credentials"
                >
                  {saveTumblrCredentials.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Tumblr Credentials
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium mb-2">How to get Tumblr API credentials:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Tumblr Developer Console (api.tumblr.com/console)</li>
                  <li>Register a new application to get Consumer Key and Secret</li>
                  <li>Use the OAuth flow to obtain Token and Token Secret</li>
                  <li>Enter all four credentials above</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Adsterra Ads Configuration</CardTitle>
                  <CardDescription>
                    Configure ad codes for each connected blog. Ads will be automatically injected when publishing posts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {connectedAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No connected blog accounts found.</p>
                  <p className="text-sm">Connect a Blogger account first to configure ad settings.</p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Select Blog Account</Label>
                    <div className="space-y-2">
                      {connectedAccounts.map((account) => (
                        <div
                          key={account.id}
                          onClick={() => handleSelectAccount(account)}
                          className={`p-4 rounded-md border cursor-pointer transition-colors hover-elevate ${
                            selectedAccountId === account.id
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                          data-testid={`account-select-${account.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{account.name}</p>
                              {account.blogUrl && (
                                <p className="text-sm text-muted-foreground truncate">{account.blogUrl}</p>
                              )}
                            </div>
                            {(account.bannerAdsCode || account.popunderAdsCode || account.adverticaBannerAdsCode) && (
                              <Badge variant="secondary" className="text-xs">Ads configured</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedAccountId ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="banner-ads-code">Banner Ads Code (Adsterra)</Label>
                          <Textarea
                            id="banner-ads-code"
                            placeholder="Paste your Adsterra banner ad code here..."
                            value={bannerAdsCode}
                            onChange={(e) => setBannerAdsCode(e.target.value)}
                            className="min-h-[120px] font-mono text-sm"
                            data-testid="input-banner-ads-code"
                          />
                          <p className="text-xs text-muted-foreground">
                            Adsterra Ad 1: After introduction. Adsterra Ad 2: Between major sections.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="popunder-ads-code">Popunder Ads Code (Adsterra)</Label>
                          <Textarea
                            id="popunder-ads-code"
                            placeholder="Paste your Adsterra popunder ad code here..."
                            value={popunderAdsCode}
                            onChange={(e) => setPopunderAdsCode(e.target.value)}
                            className="min-h-[120px] font-mono text-sm"
                            data-testid="input-popunder-ads-code"
                          />
                          <p className="text-xs text-muted-foreground">
                            This code will be inserted at the end of posts.
                          </p>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-2">
                          <Label htmlFor="advertica-banner-ads-code">Banner Ads Code (Advertica)</Label>
                          <Textarea
                            id="advertica-banner-ads-code"
                            placeholder="Paste your Advertica banner ad code here..."
                            value={adverticaBannerAdsCode}
                            onChange={(e) => setAdverticaBannerAdsCode(e.target.value)}
                            className="min-h-[120px] font-mono text-sm"
                            data-testid="input-advertica-banner-ads-code"
                          />
                          <p className="text-xs text-muted-foreground">
                            Advertica Ad 1: After first H2 section. Advertica Ad 2: Before conclusion.
                          </p>
                        </div>

                        <Button
                          onClick={handleSaveAdSettings}
                          disabled={saveAdSettings.isPending}
                          className="w-full"
                          data-testid="button-save-ad-settings"
                        >
                          {saveAdSettings.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Ad Settings
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground p-8 border border-dashed rounded-md">
                        <p>Select a blog account to configure its ad settings</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium mb-2">How ads are injected:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Adsterra Ad 1:</strong> After introduction (below 1st or 2nd paragraph)</li>
                  <li><strong>Advertica Ad 1:</strong> After the first main section (H2)</li>
                  <li><strong>Adsterra Ad 2:</strong> In the middle of the article (between major sections)</li>
                  <li><strong>Advertica Ad 2:</strong> Near the end, just before the conclusion</li>
                  <li><strong>Popunder:</strong> At the very end of the post</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Ads are centered, responsive, and properly spaced. They never appear inside paragraphs or headings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
