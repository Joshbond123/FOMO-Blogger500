import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PageConnections() {
  const [form, setForm] = useState({ bloggerAccountId: "", bloggerAccountName: "", facebookPageId: "", facebookPageName: "", autoPostEnabled: true });
  const { data: connections = [] } = useQuery<any[]>({ queryKey: ["/api/page-connections"] });

  const createConnection = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/page-connections", form),
    onSuccess: () => {
      setForm({ bloggerAccountId: "", bloggerAccountName: "", facebookPageId: "", facebookPageName: "", autoPostEnabled: true });
      queryClient.invalidateQueries({ queryKey: ["/api/page-connections"] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Page Connections</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Blogger Account ID" value={form.bloggerAccountId} onChange={(e) => setForm({ ...form, bloggerAccountId: e.target.value })} />
          <Input placeholder="Blogger Account Name" value={form.bloggerAccountName} onChange={(e) => setForm({ ...form, bloggerAccountName: e.target.value })} />
          <Input placeholder="Facebook Page ID" value={form.facebookPageId} onChange={(e) => setForm({ ...form, facebookPageId: e.target.value })} />
          <Input placeholder="Facebook Page Name" value={form.facebookPageName} onChange={(e) => setForm({ ...form, facebookPageName: e.target.value })} />
          <Button onClick={() => createConnection.mutate()} className="sm:col-span-2">Connect</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current Mappings</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {connections.map((row: any) => (
            <div key={row.id} className="rounded border p-3">
              <p className="font-medium">{row.blogger_account_name} → {row.facebook_page_name}</p>
              <p className="text-sm text-muted-foreground">Auto-post: {row.auto_post_enabled ? "Enabled" : "Disabled"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
