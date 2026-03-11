import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VideoPosts() {
  const [form, setForm] = useState({ title: "", facebookPageId: "", facebookPageName: "", videoUrl: "", dailyTime: "09:00" });
  const { data: posts = [] } = useQuery<any[]>({ queryKey: ["/api/video-posts"] });

  const createPost = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/video-posts", form),
    onSuccess: () => {
      setForm({ title: "", facebookPageId: "", facebookPageName: "", videoUrl: "", dailyTime: "09:00" });
      queryClient.invalidateQueries({ queryKey: ["/api/video-posts"] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/video-posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/video-posts"] }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Video Posts</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Facebook Page ID" value={form.facebookPageId} onChange={(e) => setForm({ ...form, facebookPageId: e.target.value })} />
          <Input placeholder="Facebook Page Name" value={form.facebookPageName} onChange={(e) => setForm({ ...form, facebookPageName: e.target.value })} />
          <Input placeholder="Video URL" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
          <Input type="time" value={form.dailyTime} onChange={(e) => setForm({ ...form, dailyTime: e.target.value })} />
          <Button onClick={() => createPost.mutate()} className="sm:col-span-2">Schedule Video</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Schedule List</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {posts.map((post: any) => (
            <div key={post.id} className="flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{post.title}</p>
                <p className="text-sm text-muted-foreground">{post.facebook_page_name || post.facebook_page_id} • {post.daily_time}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => deletePost.mutate(post.id)}>Delete</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
