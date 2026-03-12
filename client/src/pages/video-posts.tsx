import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type Schedule = { id: string; target_id: string; schedule_time: string; timezone: string; is_enabled: boolean; metadata?: { pageName?: string } };
type FbToken = { id: string; keyName?: string; metadata?: { tokenType?: string }; maskedKey: string };

export default function VideoPostsPage() {
  const { toast } = useToast();
  const [pageId, setPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00:00");
  const [timezone, setTimezone] = useState("UTC");
  const [token, setToken] = useState("");
  const [tokenType, setTokenType] = useState("page");

  const schedules = useQuery<{ success: boolean; data: Schedule[] }>({ queryKey: ["/api/video-schedules"] });
  const tokens = useQuery<{ success: boolean; data: FbToken[] }>({ queryKey: ["/api/facebook/tokens"] });

  const createSchedule = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/video-schedules", { pageId, pageName, scheduleTime, timezone }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/video-schedules"] }); toast({ title: "Schedule created" }); },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/video-schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/video-schedules"] }),
  });

  const saveToken = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/facebook/tokens", { token, tokenType, name: `${tokenType}-token` }),
    onSuccess: () => { setToken(""); queryClient.invalidateQueries({ queryKey: ["/api/facebook/tokens"] }); toast({ title: "Token saved" }); },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Video Posts</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Facebook Tokens</CardTitle>
            <CardDescription>Store page, user, or system tokens in Supabase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Token type</Label>
            <Input value={tokenType} onChange={(e) => setTokenType(e.target.value)} placeholder="page | user | system" />
            <Label>Token</Label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB..." />
            <Button onClick={() => saveToken.mutate()} disabled={!token}>Save token</Button>
            <div className="space-y-2 pt-3">
              {tokens.data?.data?.map((t) => (
                <div key={t.id} className="rounded border p-2 text-sm">{t.keyName} • {t.metadata?.tokenType} • {t.maskedKey}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Video Schedule</CardTitle>
            <CardDescription>Create, list, and delete video schedules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Facebook Page ID" />
            <Input value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="Facebook Page Name" />
            <Input value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} placeholder="HH:MM:SS" />
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Timezone" />
            <Button onClick={() => createSchedule.mutate()} disabled={!pageId || !scheduleTime}>Create schedule</Button>
            <div className="space-y-2 pt-3">
              {schedules.data?.data?.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span>{s.metadata?.pageName || s.target_id} • {s.schedule_time} • {s.timezone}</span>
                  <Button variant="destructive" size="sm" onClick={() => deleteSchedule.mutate(s.id)}>Delete</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
