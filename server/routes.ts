import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, getImagePath } from "./storage";
import { testCerebrasConnection, generateTrendingTopic, generateBlogPost, generateTrendingResearch } from "./services/cerebras";
import { testImageGeneratorConnection, generateBlogImage } from "./services/imageGenerator";
import { testImgbbConnection } from "./services/imgbb";
import { testFreeImageHostConnection } from "./services/freeimagehost";
import { testSerperConnection, searchTrendingTopicsSerper, researchTopicWithSerper } from "./services/serper";
import { validateBloggerConnection, publishToBlogger, publishToBloggerWithAccount, validateAndConnectAccount, validateAccountCredentials } from "./services/blogger";
import { testTumblrConnection, getTumblrBlogs, publishToTumblr } from "./services/tumblr";
import { testXConnection, postToX, postBlogToX } from "./services/twitter";
import { testWhatsAppConnection, sendWhatsAppMessage, sendDailyReport, getWhatsAppStatus } from "./services/whatsapp";
import { startScheduler, refreshSchedules, startDailyReportScheduler } from "./services/scheduler";
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  ensureApiKeysTable,
  initializeSupabaseTables,
  getSetupSQL,
  storeApiKeyInSupabase,
  getApiKeysFromSupabase,
  deleteApiKeyFromSupabase,
  updateApiKeyInSupabase,
  migrateApiKeysToSupabase,
  isSupabaseConfigured,
  maskApiKey 
} from "./services/supabase";
import type { Post, NicheId } from "@shared/schema";
import { NICHES } from "@shared/schema";
import path from "path";
import fs from "fs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await startScheduler();

  app.get("/api/niches", async (_req: Request, res: Response) => {
    res.json(NICHES);
  });

  app.get("/api/accounts", async (_req: Request, res: Response) => {
    try {
      const accounts = await storage.getBloggerAccounts();
      const safeAccounts = accounts.map((a) => ({
        ...a,
        clientSecret: "***",
        refreshToken: "***",
        accessToken: a.accessToken ? "***" : undefined,
      }));
      res.json(safeAccounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get accounts" });
    }
  });

  app.post("/api/accounts", async (req: Request, res: Response) => {
    try {
      const { name, blogId, nicheId } = req.body;
      if (!name || !blogId) {
        return res.status(400).json({ error: "Account name and Blog ID are required" });
      }
      
      const globalCredentials = await storage.getBloggerCredentials();
      if (!globalCredentials.client_id || !globalCredentials.client_secret || !globalCredentials.refresh_token) {
        return res.status(400).json({ error: "Please configure global OAuth credentials in Admin Settings first" });
      }
      
      const clientId = globalCredentials.client_id;
      const clientSecret = globalCredentials.client_secret;
      const refreshToken = globalCredentials.refresh_token;
      
      const validation = await validateAccountCredentials(clientId, clientSecret, refreshToken, blogId);
      
      const account = await storage.addBloggerAccount({
        name,
        blogId,
        nicheId,
        clientId,
        clientSecret,
        refreshToken,
      });
      
      if (validation.success) {
        await storage.updateBloggerAccount(account.id, {
          accessToken: validation.accessToken,
          tokenExpiry: validation.tokenExpiry,
          blogName: validation.blogName,
          blogUrl: validation.blogUrl,
          isConnected: true,
        });
        
        const updatedAccount = await storage.getBloggerAccount(account.id);
        res.json({ 
          success: true, 
          data: { 
            ...updatedAccount, 
            clientSecret: "***", 
            refreshToken: "***",
            accessToken: updatedAccount?.accessToken ? "***" : undefined,
          },
          message: validation.message,
        });
      } else {
        res.json({ 
          success: true, 
          data: { ...account, clientSecret: "***", refreshToken: "***" },
          warning: validation.message,
          message: "Account added but connection failed. You can try connecting again later.",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add account";
      res.status(500).json({ error: message });
    }
  });

  app.delete("/api/accounts/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeBloggerAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove account" });
    }
  });

  app.patch("/api/accounts/:id", async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const account = await storage.updateBloggerAccount(req.params.id, updates);
      res.json({ success: true, data: { ...account, clientSecret: "***", refreshToken: "***" } });
    } catch (error) {
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.post("/api/accounts/:id/connect", async (req: Request, res: Response) => {
    try {
      const account = await storage.getBloggerAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      
      const result = await validateAndConnectAccount(account);
      
      if (result.success) {
        const updatedAccount = await storage.getBloggerAccount(req.params.id);
        res.json({ 
          success: true, 
          data: { 
            ...updatedAccount, 
            clientSecret: "***", 
            refreshToken: "***",
            accessToken: updatedAccount?.accessToken ? "***" : undefined,
          },
          message: result.message,
        });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect account";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const safeSettings = {
        ...settings,
        cerebrasApiKeys: settings.cerebrasApiKeys.map((k) => ({
          ...k,
          key: k.key.slice(0, 4) + "..." + k.key.slice(-4),
        })),
        geminiApiKeys: settings.geminiApiKeys.map((k) => ({
          ...k,
          key: k.key.slice(0, 4) + "..." + k.key.slice(-4),
        })),
        imgbbApiKeys: (settings.imgbbApiKeys || []).map((k) => ({
          ...k,
          key: k.key.slice(0, 4) + "..." + k.key.slice(-4),
        })),
        freeImageHostApiKeys: (settings.freeImageHostApiKeys || []).map((k) => ({
          ...k,
          key: k.key.slice(0, 4) + "..." + k.key.slice(-4),
        })),
        blogger: {
          ...settings.blogger,
          accessToken: settings.blogger.accessToken ? "***" : undefined,
          refreshToken: settings.blogger.refreshToken ? "***" : undefined,
        },
        bloggerAccounts: settings.bloggerAccounts.map((a) => ({
          ...a,
          clientSecret: "***",
          refreshToken: "***",
          accessToken: a.accessToken ? "***" : undefined,
        })),
      };
      res.json(safeSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  app.post("/api/settings/gemini-keys", async (req: Request, res: Response) => {
    try {
      const { key, name } = req.body;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }
      const newKey = await storage.addGeminiKey(key, name);
      res.json({
        success: true,
        data: { ...newKey, key: newKey.key.slice(0, 4) + "..." + newKey.key.slice(-4) },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add API key" });
    }
  });

  app.delete("/api/settings/gemini-keys/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeGeminiKey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove API key" });
    }
  });

  app.post("/api/settings/cerebras-keys", async (req: Request, res: Response) => {
    try {
      const { key, name } = req.body;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }
      const newKey = await storage.addCerebrasKey(key, name);
      res.json({
        success: true,
        data: { ...newKey, key: newKey.key.slice(0, 4) + "..." + newKey.key.slice(-4) },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add API key" });
    }
  });

  app.delete("/api/settings/cerebras-keys/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeCerebrasKey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove API key" });
    }
  });

  app.post("/api/settings/imgbb-keys", async (req: Request, res: Response) => {
    try {
      const { key, name } = req.body;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }
      const newKey = await storage.addImgbbKey(key, name);
      res.json({
        success: true,
        data: { ...newKey, key: newKey.key.slice(0, 4) + "..." + newKey.key.slice(-4) },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add API key" });
    }
  });

  app.delete("/api/settings/imgbb-keys/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeImgbbKey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove API key" });
    }
  });

  app.post("/api/settings/freeimagehost-keys", async (req: Request, res: Response) => {
    try {
      const { key, name } = req.body;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }
      const newKey = await storage.addFreeImageHostKey(key, name);
      res.json({
        success: true,
        data: { ...newKey, key: newKey.key.slice(0, 4) + "..." + newKey.key.slice(-4) },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add API key" });
    }
  });

  app.delete("/api/settings/freeimagehost-keys/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeFreeImageHostKey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove API key" });
    }
  });

  app.post("/api/settings/serper-keys", async (req: Request, res: Response) => {
    try {
      const { key, name } = req.body;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }
      const newKey = await storage.addSerperKey(key, name);
      res.json({
        success: true,
        data: { ...newKey, key: newKey.key.slice(0, 4) + "..." + newKey.key.slice(-4) },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add API key" });
    }
  });

  app.delete("/api/settings/serper-keys/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeSerperKey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove API key" });
    }
  });

  app.post("/api/settings/blogger", async (req: Request, res: Response) => {
    try {
      const { blogId, accessToken, refreshToken } = req.body;
      if (!blogId || !accessToken) {
        return res.status(400).json({ error: "Blog ID and access token are required" });
      }

      const validation = await validateBloggerConnection(blogId, accessToken);
      if (!validation.success) {
        return res.status(400).json({ success: false, error: validation.message });
      }

      await storage.setBloggerSettings({
        blogId,
        accessToken,
        refreshToken,
        blogName: validation.blogName,
        blogUrl: validation.blogUrl,
        isConnected: true,
        tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      res.json({
        success: true,
        message: validation.message,
        data: { blogName: validation.blogName, blogUrl: validation.blogUrl },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to connect to Blogger" });
    }
  });

  app.delete("/api/settings/blogger", async (_req: Request, res: Response) => {
    try {
      await storage.clearBloggerSettings();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect Blogger" });
    }
  });

  app.get("/api/admin/credentials", async (_req: Request, res: Response) => {
    try {
      const credentials = await storage.getBloggerCredentials();
      const safeCredentials = {
        blog_id: credentials.blog_id || "",
        has_client_id: !!credentials.client_id,
        has_client_secret: !!credentials.client_secret,
        has_refresh_token: !!credentials.refresh_token,
        has_blog_id: !!credentials.blog_id,
      };
      res.json(safeCredentials);
    } catch (error) {
      res.status(500).json({ error: "Failed to get credentials" });
    }
  });

  app.post("/api/admin/credentials", async (req: Request, res: Response) => {
    try {
      const { client_id, client_secret, refresh_token, blog_id } = req.body;
      
      const existingCredentials = await storage.getBloggerCredentials();
      
      const isValidNewValue = (value: string | undefined, existing: string): string => {
        if (value === undefined || value === "" || value === "***" || value.endsWith("...")) {
          return existing;
        }
        return value;
      };
      
      const newCredentials = {
        client_id: isValidNewValue(client_id, existingCredentials.client_id),
        client_secret: isValidNewValue(client_secret, existingCredentials.client_secret),
        refresh_token: isValidNewValue(refresh_token, existingCredentials.refresh_token),
        blog_id: isValidNewValue(blog_id, existingCredentials.blog_id),
      };
      
      await storage.saveBloggerCredentials(newCredentials);
      res.json({ success: true, message: "Credentials saved successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save credentials" });
    }
  });

  app.post("/api/settings/schedules", async (req: Request, res: Response) => {
    try {
      const { time, timezone, accountId } = req.body;
      if (!time || typeof time !== "string") {
        return res.status(400).json({ error: "Time is required in HH:MM format" });
      }
      const schedule = await storage.addSchedule(time, timezone, accountId);
      await refreshSchedules();
      res.json({ success: true, data: schedule });
    } catch (error) {
      res.status(500).json({ error: "Failed to add schedule" });
    }
  });

  app.patch("/api/settings/schedules/:id", async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const schedule = await storage.updateSchedule(req.params.id, updates);
      await refreshSchedules();
      res.json({ success: true, data: schedule });
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  app.delete("/api/settings/schedules/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeSchedule(req.params.id);
      await refreshSchedules();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove schedule" });
    }
  });

  app.patch("/api/settings/schedules/:id/toggle", async (req: Request, res: Response) => {
    try {
      await storage.toggleSchedule(req.params.id);
      await refreshSchedules();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle schedule" });
    }
  });

  app.get("/api/posts", async (_req: Request, res: Response) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get posts" });
    }
  });

  app.get("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to get post" });
    }
  });

  app.delete("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      await storage.deletePost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/images/:filename", (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      
      if (!filename || filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({ error: "Invalid filename" });
      }
      
      const imagePath = getImagePath(filename);
      
      if (!imagePath) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      const extension = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };
      
      const contentType = mimeTypes[extension] || "image/png";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      const imageStream = fs.createReadStream(imagePath);
      imageStream.pipe(res);
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  app.post("/api/test/cerebras", async (_req: Request, res: Response) => {
    try {
      const result = await testCerebrasConnection();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  app.post("/api/test/image-generator", async (_req: Request, res: Response) => {
    try {
      const result = await testImageGeneratorConnection();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  app.post("/api/test/imgbb", async (_req: Request, res: Response) => {
    try {
      const result = await testImgbbConnection();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  app.post("/api/test/freeimagehost", async (_req: Request, res: Response) => {
    try {
      const result = await testFreeImageHostConnection();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  app.post("/api/test/serper", async (_req: Request, res: Response) => {
    try {
      const result = await testSerperConnection();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  app.post("/api/research/serper", async (req: Request, res: Response) => {
    try {
      const { nicheId } = req.body;
      const result = await searchTrendingTopicsSerper(nicheId as NicheId);
      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/research/serper/topic", async (req: Request, res: Response) => {
    try {
      const { topic, nicheId } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }
      const result = await researchTopicWithSerper(topic, nicheId as NicheId);
      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get("/api/research", async (_req: Request, res: Response) => {
    try {
      const research = await storage.getTrendingResearch();
      const recentResearch = research
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      res.json(recentResearch);
    } catch (error) {
      res.status(500).json({ error: "Failed to get research logs" });
    }
  });

  app.get("/api/research/:id", async (req: Request, res: Response) => {
    try {
      const research = await storage.getTrendingResearchById(req.params.id);
      if (!research) {
        return res.status(404).json({ error: "Research not found" });
      }
      res.json(research);
    } catch (error) {
      res.status(500).json({ error: "Failed to get research" });
    }
  });

  app.post("/api/generate/topic", async (req: Request, res: Response) => {
    try {
      const { nicheId } = req.body;
      const MAX_RETRIES = 5;
      let attempts = 0;
      let topic = await generateTrendingTopic(nicheId as NicheId);
      
      while (await storage.isTopicUsed(topic.topic, nicheId) && attempts < MAX_RETRIES) {
        attempts++;
        console.log(`Topic "${topic.topic}" already used, retrying (attempt ${attempts}/${MAX_RETRIES})...`);
        topic = await generateTrendingTopic(nicheId as NicheId);
      }
      
      if (await storage.isTopicUsed(topic.topic, nicheId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Unable to generate a unique topic after multiple attempts. Please try again or enter a custom topic." 
        });
      }
      
      await storage.addUsedTopic(topic.topic, nicheId);
      res.json({ success: true, data: topic });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/generate/post", async (req: Request, res: Response) => {
    try {
      const { topic, nicheId, accountId } = req.body;
      
      let topicToUse = topic;
      let fomoHook: string | undefined;
      
      if (!topicToUse) {
        const MAX_RETRIES = 5;
        let attempts = 0;
        let generatedTopic = await generateTrendingTopic(nicheId as NicheId);
        
        while (await storage.isTopicUsed(generatedTopic.topic, nicheId) && attempts < MAX_RETRIES) {
          attempts++;
          console.log(`Topic "${generatedTopic.topic}" already used, retrying (attempt ${attempts}/${MAX_RETRIES})...`);
          generatedTopic = await generateTrendingTopic(nicheId as NicheId);
        }
        
        if (await storage.isTopicUsed(generatedTopic.topic, nicheId)) {
          return res.status(400).json({ 
            success: false, 
            error: "Unable to generate a unique topic after multiple attempts. Please try again or enter a custom topic." 
          });
        }
        
        topicToUse = generatedTopic.topic;
        fomoHook = generatedTopic.fomoHook;
      }

      const content = await generateBlogPost(topicToUse, fomoHook, nicheId as NicheId);

      let imageUrl: string | undefined;
      const image = await generateBlogImage(content.imagePrompt);
      if (image) {
        imageUrl = image;
      }

      const account = accountId ? await storage.getBloggerAccount(accountId) : undefined;

      const post = await storage.createPost({
        title: content.title,
        content: content.content,
        excerpt: content.excerpt,
        topic: topicToUse,
        nicheId,
        accountId,
        accountName: account?.name,
        imageUrl,
        status: "draft",
        labels: content.labels,
      });

      await storage.addUsedTopic(topicToUse, nicheId);
      res.json({ success: true, data: post });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/publish/latest", async (_req: Request, res: Response) => {
    try {
      const posts = await storage.getPosts();
      const draftPost = posts
        .filter((p) => p.status === "draft")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!draftPost) {
        return res.status(404).json({ success: false, error: "No draft posts to publish" });
      }

      let result;
      
      if (draftPost.accountId) {
        const account = await storage.getBloggerAccount(draftPost.accountId);
        if (account) {
          result = await publishToBloggerWithAccount(draftPost, account);
        } else {
          result = await publishToBlogger(draftPost);
        }
      } else {
        result = await publishToBlogger(draftPost);
      }

      if (result.success) {
        const updatedPost = await storage.updatePost(draftPost.id, {
          status: "published",
          publishedAt: new Date().toISOString(),
          bloggerPostId: result.postId,
          bloggerPostUrl: result.postUrl,
        });
        
        // Auto-publish to Tumblr if there's a connection for this account
        let tumblrResult = null;
        if (draftPost.accountId && result.postUrl) {
          try {
            const connections = await storage.getTumblrConnections();
            const connection = connections.find(c => c.bloggerAccountId === draftPost.accountId);
            
            if (connection) {
              tumblrResult = await publishToTumblr(
                connection.tumblrBlogName,
                draftPost,
                result.postUrl
              );
              
              if (tumblrResult.success) {
                console.log(`Auto-posted to Tumblr: ${tumblrResult.postUrl}`);
              } else {
                console.log(`Tumblr cross-post failed: ${tumblrResult.message}`);
              }
            }
          } catch (tumblrError) {
            console.log("Tumblr cross-post error:", tumblrError);
          }
        }
        
        const message = tumblrResult?.success 
          ? `${result.message} (Also posted to Tumblr)` 
          : result.message;
        
        res.json({ success: true, data: updatedPost, message, tumblrPosted: tumblrResult?.success || false });
      } else {
        await storage.updatePost(draftPost.id, {
          status: "failed",
          errorMessage: result.message,
        });
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/publish/:id", async (req: Request, res: Response) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      let result;
      
      if (post.accountId) {
        const account = await storage.getBloggerAccount(post.accountId);
        if (account) {
          result = await publishToBloggerWithAccount(post, account);
        } else {
          result = await publishToBlogger(post);
        }
      } else {
        result = await publishToBlogger(post);
      }

      if (result.success) {
        const updatedPost = await storage.updatePost(post.id, {
          status: "published",
          publishedAt: new Date().toISOString(),
          bloggerPostId: result.postId,
          bloggerPostUrl: result.postUrl,
        });
        
        // Auto-publish to Tumblr if there's a connection for this account
        let tumblrResult = null;
        if (post.accountId && result.postUrl) {
          try {
            const connections = await storage.getTumblrConnections();
            const connection = connections.find(c => c.bloggerAccountId === post.accountId);
            
            if (connection) {
              tumblrResult = await publishToTumblr(
                connection.tumblrBlogName,
                post,
                result.postUrl
              );
              
              if (tumblrResult.success) {
                console.log(`Auto-posted to Tumblr: ${tumblrResult.postUrl}`);
              } else {
                console.log(`Tumblr cross-post failed: ${tumblrResult.message}`);
              }
            }
          } catch (tumblrError) {
            console.log("Tumblr cross-post error:", tumblrError);
          }
        }
        
        const message = tumblrResult?.success 
          ? `${result.message} (Also posted to Tumblr)` 
          : result.message;
        
        res.json({ success: true, data: updatedPost, message, tumblrPosted: tumblrResult?.success || false });
      } else {
        await storage.updatePost(post.id, {
          status: "failed",
          errorMessage: result.message,
        });
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  // Trending Research endpoints
  app.get("/api/research", async (_req: Request, res: Response) => {
    try {
      const research = await storage.getTrendingResearch();
      res.json(research);
    } catch (error) {
      res.status(500).json({ error: "Failed to get research data" });
    }
  });

  app.get("/api/research/:id", async (req: Request, res: Response) => {
    try {
      const research = await storage.getTrendingResearchById(req.params.id);
      if (!research) {
        return res.status(404).json({ error: "Research not found" });
      }
      res.json(research);
    } catch (error) {
      res.status(500).json({ error: "Failed to get research" });
    }
  });

  app.delete("/api/research/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteTrendingResearch(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete research" });
    }
  });

  // Generate new research for a niche and optionally create a post
  app.post("/api/research/generate", async (req: Request, res: Response) => {
    try {
      const { nicheId, createPost, accountId } = req.body;
      
      if (!nicheId) {
        return res.status(400).json({ error: "Niche ID is required" });
      }

      // Generate trending research
      const researchData = await generateTrendingResearch(nicheId as NicheId);
      
      // Save the research
      let research = await storage.createTrendingResearch(researchData);

      // Optionally create a blog post from this research
      if (createPost) {
        const content = await generateBlogPost(research.title, undefined, nicheId as NicheId);
        
        let imageUrl: string | undefined;
        const image = await generateBlogImage(content.imagePrompt);
        if (image) {
          imageUrl = image;
        }

        const account = accountId ? await storage.getBloggerAccount(accountId) : undefined;

        const post = await storage.createPost({
          title: content.title,
          content: content.content,
          excerpt: content.excerpt,
          topic: research.title,
          nicheId,
          accountId,
          accountName: account?.name,
          imageUrl,
          status: "draft",
          labels: content.labels,
        });

        // Update research with post info
        const updatedResearch = await storage.getTrendingResearchById(research.id);
        if (updatedResearch) {
          research = {
            ...updatedResearch,
            postId: post.id,
            postTitle: post.title,
          };
        }

        await storage.addUsedTopic(research.title, nicheId);

        res.json({ success: true, data: { research, post } });
      } else {
        res.json({ success: true, data: { research } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  // Tumblr integration endpoints
  app.get("/api/tumblr/credentials", async (_req: Request, res: Response) => {
    try {
      const credentials = await storage.getTumblrCredentials();
      const safeCredentials = {
        has_consumer_key: !!credentials.consumer_key,
        has_consumer_secret: !!credentials.consumer_secret,
        has_token: !!credentials.token,
        has_token_secret: !!credentials.token_secret,
      };
      res.json(safeCredentials);
    } catch (error) {
      res.status(500).json({ error: "Failed to get Tumblr credentials" });
    }
  });

  app.post("/api/tumblr/credentials", async (req: Request, res: Response) => {
    try {
      const { consumer_key, consumer_secret, token, token_secret } = req.body;
      
      const existingCredentials = await storage.getTumblrCredentials();
      
      const isValidNewValue = (value: string | undefined, existing: string): string => {
        if (value === undefined || value === "" || value === "***" || value.endsWith("...")) {
          return existing;
        }
        return value;
      };
      
      const newCredentials = {
        consumer_key: isValidNewValue(consumer_key, existingCredentials.consumer_key),
        consumer_secret: isValidNewValue(consumer_secret, existingCredentials.consumer_secret),
        token: isValidNewValue(token, existingCredentials.token),
        token_secret: isValidNewValue(token_secret, existingCredentials.token_secret),
      };
      
      await storage.saveTumblrCredentials(newCredentials);
      res.json({ success: true, message: "Tumblr credentials saved successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save Tumblr credentials" });
    }
  });

  app.post("/api/test/tumblr", async (_req: Request, res: Response) => {
    try {
      const result = await testTumblrConnection();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  app.get("/api/tumblr/blogs", async (_req: Request, res: Response) => {
    try {
      const result = await getTumblrBlogs();
      if (result.success) {
        res.json({ success: true, blogs: result.blogs });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get("/api/tumblr/connections", async (_req: Request, res: Response) => {
    try {
      const connections = await storage.getTumblrConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get Tumblr connections" });
    }
  });

  app.post("/api/tumblr/connections", async (req: Request, res: Response) => {
    try {
      const { tumblrBlogId, tumblrBlogName, bloggerAccountId, bloggerAccountName } = req.body;
      
      if (!tumblrBlogId || !tumblrBlogName || !bloggerAccountId || !bloggerAccountName) {
        return res.status(400).json({ error: "All connection fields are required" });
      }
      
      const connection = await storage.addTumblrConnection({
        tumblrBlogId,
        tumblrBlogName,
        bloggerAccountId,
        bloggerAccountName,
      });
      
      res.json({ success: true, data: connection });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.delete("/api/tumblr/connections/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeTumblrConnection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove Tumblr connection" });
    }
  });

  // X (Twitter) Integration Routes
  app.get("/api/x/accounts", async (_req: Request, res: Response) => {
    try {
      const accounts = await storage.getXAccounts();
      const safeAccounts = accounts.map((a) => ({
        id: a.id,
        name: a.name,
        username: a.username,
        isConnected: a.isConnected,
        lastTestedAt: a.lastTestedAt,
        hasApiKey: !!a.apiKey,
        hasApiSecret: !!a.apiSecret,
        hasAccessToken: !!a.accessToken,
        hasAccessTokenSecret: !!a.accessTokenSecret,
      }));
      res.json(safeAccounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get X accounts" });
    }
  });

  app.post("/api/x/accounts", async (req: Request, res: Response) => {
    try {
      const { name, apiKey, apiSecret, accessToken, accessTokenSecret } = req.body;
      
      if (!name || !apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      const account = await storage.addXAccount({
        name,
        apiKey,
        apiSecret,
        accessToken,
        accessTokenSecret,
      });
      
      res.json({ 
        success: true, 
        data: {
          id: account.id,
          name: account.name,
          username: account.username,
          isConnected: account.isConnected,
          hasApiKey: !!account.apiKey,
          hasApiSecret: !!account.apiSecret,
          hasAccessToken: !!account.accessToken,
          hasAccessTokenSecret: !!account.accessTokenSecret,
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add X account";
      res.status(500).json({ error: message });
    }
  });

  app.delete("/api/x/accounts/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeXAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove X account" });
    }
  });

  app.put("/api/x/accounts/:id", async (req: Request, res: Response) => {
    try {
      const { name, apiKey, apiSecret, accessToken, accessTokenSecret } = req.body;
      
      const existingAccount = await storage.getXAccount(req.params.id);
      if (!existingAccount) {
        return res.status(404).json({ error: "X account not found" });
      }
      
      const updateData: Record<string, string> = {};
      if (name) updateData.name = name;
      if (apiKey) updateData.apiKey = apiKey;
      if (apiSecret) updateData.apiSecret = apiSecret;
      if (accessToken) updateData.accessToken = accessToken;
      if (accessTokenSecret) updateData.accessTokenSecret = accessTokenSecret;
      
      const updated = await storage.updateXAccount(req.params.id, updateData);
      
      res.json({ 
        success: true, 
        data: updated ? {
          id: updated.id,
          name: updated.name,
          username: updated.username,
          isConnected: updated.isConnected,
          lastTestedAt: updated.lastTestedAt,
          hasApiKey: !!updated.apiKey,
          hasApiSecret: !!updated.apiSecret,
          hasAccessToken: !!updated.accessToken,
          hasAccessTokenSecret: !!updated.accessTokenSecret,
        } : null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update X account";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/x/accounts/:id/test", async (req: Request, res: Response) => {
    try {
      const account = await storage.getXAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "X account not found" });
      }
      
      const result = await testXConnection(
        account.apiKey,
        account.apiSecret,
        account.accessToken,
        account.accessTokenSecret
      );
      
      if (result.success && result.username) {
        await storage.updateXAccount(req.params.id, {
          isConnected: true,
          username: result.username,
          lastTestedAt: new Date().toISOString(),
        });
      } else {
        await storage.updateXAccount(req.params.id, {
          isConnected: false,
          lastTestedAt: new Date().toISOString(),
        });
      }
      
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  app.post("/api/test/x", async (req: Request, res: Response) => {
    try {
      const { apiKey, apiSecret, accessToken, accessTokenSecret } = req.body;
      
      if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        return res.status(400).json({ success: false, message: "All credentials are required" });
      }
      
      const result = await testXConnection(apiKey, apiSecret, accessToken, accessTokenSecret);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.json({ success: false, message });
    }
  });

  // Direct test endpoint for posting to X with an account ID
  app.post("/api/x/accounts/:id/post-test", async (req: Request, res: Response) => {
    try {
      const account = await storage.getXAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "X account not found" });
      }
      
      // Log credential lengths only (never log actual keys)
      console.log("[X Direct Post Test] Account from storage:", {
        id: account.id,
        name: account.name,
        apiKeyLength: account.apiKey?.length,
        apiSecretLength: account.apiSecret?.length,
        accessTokenLength: account.accessToken?.length,
        accessTokenSecretLength: account.accessTokenSecret?.length,
      });
      
      const testMessage = `Test post from API at ${new Date().toISOString().slice(0, 19)}`;
      
      const result = await postToX(account, testMessage);
      
      res.json({
        ...result,
        credentialDebug: {
          apiKeyLength: account.apiKey?.length,
          apiSecretLength: account.apiSecret?.length,
          accessTokenLength: account.accessToken?.length,
          accessTokenSecretLength: account.accessTokenSecret?.length,
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  // X-Blogger Connections
  app.get("/api/x/connections", async (_req: Request, res: Response) => {
    try {
      const connections = await storage.getXConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get X connections" });
    }
  });

  app.post("/api/x/connections", async (req: Request, res: Response) => {
    try {
      const { xAccountId, xAccountName, bloggerAccountId, bloggerAccountName } = req.body;
      
      if (!xAccountId || !xAccountName || !bloggerAccountId || !bloggerAccountName) {
        return res.status(400).json({ error: "All connection fields are required" });
      }
      
      const connection = await storage.addXConnection({
        xAccountId,
        xAccountName,
        bloggerAccountId,
        bloggerAccountName,
        isActive: true,
      });
      
      res.json({ success: true, data: connection });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.delete("/api/x/connections/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeXConnection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove X connection" });
    }
  });

  app.post("/api/x/post/:postId", async (req: Request, res: Response) => {
    try {
      const post = await storage.getPost(req.params.postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      if (!post.accountId) {
        return res.status(400).json({ error: "Post is not associated with a blogger account" });
      }
      
      const result = await postBlogToX(post.accountId, post);
      
      if (result.success) {
        res.json({ success: true, message: result.message, tweetUrl: result.tweetUrl });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/whatsapp/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getWhatsAppSettings();
      const safeSettings = {
        ...settings,
        apiKey: settings.apiKey ? "***" : undefined,
      };
      res.json(safeSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get WhatsApp settings" });
    }
  });

  app.post("/api/whatsapp/settings", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, apiKey, isEnabled, notifyOnFailure, sendDailyReport } = req.body;
      
      const updates: any = {};
      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
      if (apiKey !== undefined) updates.apiKey = apiKey;
      if (isEnabled !== undefined) updates.isEnabled = isEnabled;
      if (notifyOnFailure !== undefined) updates.notifyOnFailure = notifyOnFailure;
      if (sendDailyReport !== undefined) updates.sendDailyReport = sendDailyReport;
      
      const settings = await storage.updateWhatsAppSettings(updates);
      
      res.json({ 
        success: true, 
        data: {
          ...settings,
          apiKey: settings.apiKey ? "***" : undefined,
        },
        message: "WhatsApp settings saved successfully" 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/whatsapp/test", async (_req: Request, res: Response) => {
    try {
      const result = await testWhatsAppConnection();
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test failed";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/whatsapp/status", async (_req: Request, res: Response) => {
    try {
      const status = await getWhatsAppStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  app.post("/api/whatsapp/send-daily-report", async (_req: Request, res: Response) => {
    try {
      const result = await sendDailyReport();
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send report";
      res.status(500).json({ error: message });
    }
  });

  await startDailyReportScheduler();

  // Supabase configuration routes
  app.get("/api/supabase/config", async (_req: Request, res: Response) => {
    try {
      const config = await getSupabaseConfig();
      res.json({
        projectUrl: config.projectUrl || "",
        serviceRoleKey: config.serviceRoleKey ? "***" : "",
        isConfigured: config.isConfigured,
        configuredAt: config.configuredAt,
        hasServiceRoleKey: !!config.serviceRoleKey,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Supabase config" });
    }
  });

  app.post("/api/supabase/config", async (req: Request, res: Response) => {
    try {
      const { projectUrl, serviceRoleKey } = req.body;
      
      if (!projectUrl) {
        return res.status(400).json({ error: "Project URL is required" });
      }
      
      const config = await saveSupabaseConfig({ projectUrl, serviceRoleKey });
      
      let tablesReady = false;
      let setupRequired = false;
      let setupSQL: string | undefined;
      
      if (config.isConfigured) {
        const initResult = await initializeSupabaseTables();
        tablesReady = initResult.tablesReady;
        setupRequired = initResult.setupRequired;
        if (initResult.setupSQL) {
          setupSQL = initResult.setupSQL;
        }
      }
      
      res.json({ 
        success: true, 
        message: tablesReady 
          ? "Supabase configured successfully - database tables are ready" 
          : "Supabase configuration saved - database setup required",
        tablesReady,
        setupRequired,
        setupSQL,
        data: {
          projectUrl: config.projectUrl,
          serviceRoleKey: "***",
          isConfigured: config.isConfigured,
          configuredAt: config.configuredAt,
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save config";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/supabase/test", async (_req: Request, res: Response) => {
    try {
      const result = await testSupabaseConnection();
      if (result.success) {
        const tableCheck = await ensureApiKeysTable();
        res.json({ 
          success: true, 
          message: result.message,
          tablesReady: tableCheck.success,
          setupRequired: tableCheck.setupRequired,
          setupSQL: tableCheck.setupSQL,
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test failed";
      res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/supabase/check-tables", async (_req: Request, res: Response) => {
    try {
      const configured = await isSupabaseConfigured();
      if (!configured) {
        return res.status(400).json({ 
          success: false, 
          error: "Supabase is not configured. Please save your Supabase configuration first." 
        });
      }

      const initResult = await initializeSupabaseTables();
      
      res.json({ 
        success: true, 
        tablesReady: initResult.tablesReady,
        setupRequired: initResult.setupRequired,
        setupSQL: initResult.setupSQL,
        message: initResult.tablesReady 
          ? "Database tables are ready" 
          : "Database tables need to be created. Please run the provided SQL in your Supabase SQL Editor.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check tables";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get("/api/supabase/setup-sql", async (_req: Request, res: Response) => {
    const sql = getSetupSQL();
    res.json({ 
      sql,
      instructions: "Copy and paste this SQL into your Supabase SQL Editor (Dashboard > SQL Editor) and run it to create the required tables."
    });
  });

  app.post("/api/supabase/migrate", async (_req: Request, res: Response) => {
    try {
      const configured = await isSupabaseConfigured();
      if (!configured) {
        return res.status(400).json({ error: "Supabase is not configured" });
      }

      const settings = await storage.getSettings();
      const bloggerCredentials = await storage.getBloggerCredentials();
      const tumblrCredentials = await storage.getTumblrCredentials();
      const whatsappSettings = await storage.getWhatsAppSettings();

      const existingKeys = {
        cerebras: settings.cerebrasApiKeys,
        gemini: settings.geminiApiKeys,
        imgbb: settings.imgbbApiKeys,
        freeimagehost: settings.freeImageHostApiKeys,
        serper: settings.serperApiKeys,
        blogger: bloggerCredentials,
        tumblr: tumblrCredentials,
        whatsapp: whatsappSettings,
      };

      const result = await migrateApiKeysToSupabase(existingKeys);
      
      res.json({
        success: result.success,
        migratedCount: result.migratedCount,
        errors: result.errors,
        message: result.success 
          ? `Successfully migrated ${result.migratedCount} keys to Supabase` 
          : `Migration completed with errors. Migrated ${result.migratedCount} keys.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Migration failed";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/supabase/keys", async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const result = await getApiKeysFromSupabase(type as string | undefined);
      
      if (result.success) {
        res.json({ success: true, keys: result.keys });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get keys" });
    }
  });

  app.post("/api/supabase/keys", async (req: Request, res: Response) => {
    try {
      const { keyType, key, keyName, metadata } = req.body;
      
      if (!keyType || !key) {
        return res.status(400).json({ error: "Key type and key value are required" });
      }
      
      const result = await storeApiKeyInSupabase(keyType, key, keyName, metadata);
      
      if (result.success) {
        res.json({ success: true, id: result.id, message: "Key stored successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to store key";
      res.status(500).json({ error: message });
    }
  });

  app.patch("/api/supabase/keys/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { key, keyName, metadata } = req.body;
      
      const result = await updateApiKeyInSupabase(id, { key, keyName, metadata });
      
      if (result.success) {
        res.json({ success: true, message: "Key updated successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update key";
      res.status(500).json({ error: message });
    }
  });

  app.delete("/api/supabase/keys/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await deleteApiKeyFromSupabase(id);
      
      if (result.success) {
        res.json({ success: true, message: "Key deleted successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete key" });
    }
  });

  app.get("/api/supabase/status", async (_req: Request, res: Response) => {
    try {
      const configured = await isSupabaseConfigured();
      res.json({ isConfigured: configured });
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  return httpServer;
}
