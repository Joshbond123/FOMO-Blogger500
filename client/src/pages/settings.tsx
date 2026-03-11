import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function KeySection({ title, keyType }: { title: string; keyType: string }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const { data } = useQuery<{ success: boolean; keys: any[] }>({ queryKey: [`/api/supabase/keys?type=${keyType}`] });

  const add = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/supabase/keys", { keyType, keyName: name || undefined, key }),
    onSuccess: () => {
      setName("");
      setKey("");
      queryClient.invalidateQueries({ queryKey: [`/api/supabase/keys?type=${keyType}`] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Secret key/token" value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
        <Button onClick={() => add.mutate()}>Save</Button>
        <div className="space-y-1">
          {(data?.keys || []).map((k) => (
            <p key={k.id} className="text-sm text-muted-foreground">• {k.keyName || "unnamed"}: {k.maskedKey}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [projectUrl, setProjectUrl] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [userAccessToken, setUserAccessToken] = useState("");

  const { data: supabase } = useQuery<any>({ queryKey: ["/api/supabase/config"] });

  const saveSupabase = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/supabase/config", { projectUrl, serviceRoleKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supabase/config"] });
      apiRequest("POST", "/api/supabase/migrate");
    },
  });

  const testSupabase = useMutation({ mutationFn: async () => apiRequest("POST", "/api/supabase/test") });
  const fetchFacebookPages = useMutation({ mutationFn: async () => apiRequest("POST", "/api/facebook/pages", { userAccessToken }) });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Supabase Configuration</CardTitle>
          <CardDescription>Primary storage backend for all modules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="SUPABASE_URL" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} />
          <Input placeholder="SUPABASE_ACCESS_TOKEN" value={serviceRoleKey} onChange={(e) => setServiceRoleKey(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveSupabase.mutate()}>Save</Button>
            <Button variant="outline" onClick={() => testSupabase.mutate()}>Test connection</Button>
          </div>
          <p className="text-sm text-muted-foreground">Configured: {supabase?.isConfigured ? "Yes" : "No"}</p>
          {testSupabase.data && <pre className="text-xs">{JSON.stringify(testSupabase.data, null, 2)}</pre>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <KeySection title="Workers AI (text + image)" keyType="workers_ai" />
        <KeySection title="Lightning.ai (video scenes only)" keyType="lightning_ai" />
        <KeySection title="Facebook Tokens (unlimited)" keyType="facebook_token" />
        <KeySection title="ElevenLabs API Keys (unlimited)" keyType="elevenlabs" />
        <KeySection title="GitHub Personal Access Token" keyType="github_pat" />
        <KeySection title="Catbox Configuration" keyType="catbox" />
      </div>

      <Card>
        <CardHeader><CardTitle>Facebook Page Fetch Test</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="User Access Token" value={userAccessToken} onChange={(e) => setUserAccessToken(e.target.value)} />
          <Button onClick={() => fetchFacebookPages.mutate()}>Fetch connected pages</Button>
          {fetchFacebookPages.data && <pre className="text-xs">{JSON.stringify(fetchFacebookPages.data, null, 2)}</pre>}
        </CardContent>
      </Card>
    </div>
  );
}
