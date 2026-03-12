import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { encrypt, decrypt, maskApiKey } from "./encryption";
import type { SupabaseConfig, SupabaseStoredKey } from "@shared/schema";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const SUPABASE_CONFIG_FILE = path.join(STORAGE_DIR, "supabase_config.json");

function ensureStorageDirectoryExists() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  ensureStorageDirectoryExists();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureStorageDirectoryExists();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw new Error(`Failed to write to ${filePath}`);
  }
}

const defaultSupabaseConfig: SupabaseConfig = {
  projectUrl: "",
  serviceRoleKey: "",
  isConfigured: false,
};

function getSupabaseConfigFromEnvironment(): Partial<SupabaseConfig> {
  const projectUrl = process.env.SUPABASE_URL?.trim() || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!projectUrl || !serviceRoleKey) {
    return {};
  }

  return {
    projectUrl,
    serviceRoleKey,
    isConfigured: true,
  };
}

export async function getSupabaseConfig(): Promise<SupabaseConfig> {
  const configFromFile = readJsonFile<SupabaseConfig>(SUPABASE_CONFIG_FILE, defaultSupabaseConfig);
  const configFromEnvironment = getSupabaseConfigFromEnvironment();

  const config = {
    ...configFromFile,
    ...configFromEnvironment,
  };

  config.isConfigured = !!(config.projectUrl && config.serviceRoleKey);
  return config;
}

export async function saveSupabaseConfig(config: Partial<SupabaseConfig>): Promise<SupabaseConfig> {
  const existingConfig = await getSupabaseConfig();
  
  const newConfig: SupabaseConfig = {
    ...existingConfig,
    ...config,
    configuredAt: new Date().toISOString(),
  };
  
  if (config.serviceRoleKey && config.serviceRoleKey !== "***" && !config.serviceRoleKey.endsWith("...")) {
    newConfig.serviceRoleKey = encrypt(config.serviceRoleKey);
  } else if (existingConfig.serviceRoleKey) {
    newConfig.serviceRoleKey = existingConfig.serviceRoleKey;
  }
  
  newConfig.isConfigured = !!(newConfig.projectUrl && newConfig.serviceRoleKey);
  
  writeJsonFile(SUPABASE_CONFIG_FILE, newConfig);
  return newConfig;
}

export async function getDecryptedServiceRoleKey(): Promise<string | null> {
  const config = await getSupabaseConfig();
  if (!config.serviceRoleKey) return null;

  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  
  try {
    return decrypt(config.serviceRoleKey);
  } catch (error) {
    console.error("Failed to decrypt service role key:", error);
    return null;
  }
}

export async function isSupabaseConfigured(): Promise<boolean> {
  if (process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return true;
  }

  const config = await getSupabaseConfig();
  return config.isConfigured;
}

async function getSupabaseClient() {
  const config = await getSupabaseConfig();
  if (!config.isConfigured || !config.projectUrl) {
    return null;
  }
  
  const serviceRoleKey = await getDecryptedServiceRoleKey();
  if (!serviceRoleKey) {
    return null;
  }
  
  return {
    url: config.projectUrl,
    key: serviceRoleKey,
  };
}

async function makeSupabaseRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<{ data?: unknown; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: "Supabase not configured" };
  }
  
  try {
    const url = `${client.url}/rest/v1/${endpoint}`;
    const headers: Record<string, string> = {
      "apikey": client.key,
      "Authorization": `Bearer ${client.key}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    };
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Supabase request failed: ${errorText}` };
    }
    
    if (method === "DELETE" || response.status === 204) {
      return { data: { success: true } };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: message };
  }
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, message: "Supabase not configured" };
  }
  
  try {
    const response = await fetch(`${client.url}/rest/v1/`, {
      method: "GET",
      headers: {
        "apikey": client.key,
        "Authorization": `Bearer ${client.key}`,
      },
    });
    
    if (response.ok) {
      return { success: true, message: "Connected to Supabase successfully" };
    } else {
      const errorText = await response.text();
      return { success: false, message: `Connection failed: ${errorText}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Connection error: ${message}` };
  }
}

export function getSetupSQL(): string {
  return `-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor):

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type TEXT NOT NULL,
  key_name TEXT,
  encrypted_key TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doc_type, doc_key)
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  target_id TEXT,
  schedule_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche TEXT NOT NULL,
  topic TEXT NOT NULL,
  normalized_topic TEXT NOT NULL,
  source TEXT,
  used_for TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(normalized_topic)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_type ON api_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_storage_documents_type_key ON storage_documents(doc_type, doc_key);
CREATE INDEX IF NOT EXISTS idx_schedules_channel_enabled ON schedules(channel, is_enabled);
CREATE INDEX IF NOT EXISTS idx_topics_niche_created ON topics(niche, created_at DESC);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for service role" ON api_keys;
CREATE POLICY "Enable all access for service role" ON api_keys FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for service role" ON storage_documents;
CREATE POLICY "Enable all access for service role" ON storage_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for service role" ON settings;
CREATE POLICY "Enable all access for service role" ON settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for service role" ON schedules;
CREATE POLICY "Enable all access for service role" ON schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for service role" ON topics;
CREATE POLICY "Enable all access for service role" ON topics FOR ALL USING (true) WITH CHECK (true);`;
}

export async function checkTablesExist(): Promise<{ exists: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { exists: false, error: "Supabase not configured" };
  }

  try {
    const tableChecks = ["api_keys", "storage_documents", "settings", "schedules", "topics"];

    for (const tableName of tableChecks) {
      const checkResponse = await fetch(`${client.url}/rest/v1/${tableName}?select=*&limit=1`, {
        method: "GET",
        headers: {
          "apikey": client.key,
          "Authorization": `Bearer ${client.key}`,
        },
      });

      if (!checkResponse.ok) {
        return { exists: false };
      }
    }

    return { exists: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { exists: false, error: message };
  }
}

export async function initializeSupabaseTables(): Promise<{ success: boolean; tablesReady: boolean; setupRequired: boolean; setupSQL?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, tablesReady: false, setupRequired: false };
  }

  try {
    const tableCheck = await checkTablesExist();
    
    if (tableCheck.exists) {
      return { success: true, tablesReady: true, setupRequired: false };
    }

    return { 
      success: true, 
      tablesReady: false, 
      setupRequired: true,
      setupSQL: getSetupSQL()
    };
  } catch (error) {
    return { success: false, tablesReady: false, setupRequired: false };
  }
}

export async function ensureApiKeysTable(): Promise<{ success: boolean; setupRequired: boolean; setupSQL?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, setupRequired: false };
  }
  
  try {
    const tableCheck = await checkTablesExist();
    
    if (tableCheck.exists) {
      return { success: true, setupRequired: false };
    }

    return { 
      success: false, 
      setupRequired: true,
      setupSQL: getSetupSQL()
    };
  } catch (error) {
    return { success: false, setupRequired: false };
  }
}

export async function storeApiKeyInSupabase(
  keyType: string,
  key: string,
  keyName?: string,
  metadata?: Record<string, string>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const configured = await isSupabaseConfigured();
  if (!configured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const encryptedKey = encrypt(key);
  const id = randomUUID();
  const now = new Date().toISOString();
  
  const record = {
    id,
    key_type: keyType,
    key_name: keyName || null,
    encrypted_key: encryptedKey,
    metadata: metadata || {},
    created_at: now,
    updated_at: now,
  };
  
  const result = await makeSupabaseRequest("api_keys", "POST", record);
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  return { success: true, id };
}

export async function getApiKeysFromSupabase(keyType?: string): Promise<{
  success: boolean;
  keys?: Array<{
    id: string;
    keyType: string;
    keyName?: string;
    maskedKey: string;
    metadata?: Record<string, string>;
    createdAt: string;
  }>;
  error?: string;
}> {
  const configured = await isSupabaseConfigured();
  if (!configured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  let endpoint = "api_keys?select=id,key_type,key_name,encrypted_key,metadata,created_at";
  if (keyType) {
    endpoint += `&key_type=eq.${keyType}`;
  }
  
  const result = await makeSupabaseRequest(endpoint);
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  const rows = result.data as Array<{
    id: string;
    key_type: string;
    key_name?: string;
    encrypted_key: string;
    metadata?: Record<string, string>;
    created_at: string;
  }>;
  
  const keys = rows.map((row) => {
    let maskedKey = "***";
    try {
      const decryptedKey = decrypt(row.encrypted_key);
      maskedKey = maskApiKey(decryptedKey);
    } catch {
      maskedKey = "***";
    }
    
    return {
      id: row.id,
      keyType: row.key_type,
      keyName: row.key_name,
      maskedKey,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  });
  
  return { success: true, keys };
}

export async function getDecryptedApiKey(id: string): Promise<{ success: boolean; key?: string; error?: string }> {
  const configured = await isSupabaseConfigured();
  if (!configured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const result = await makeSupabaseRequest(`api_keys?id=eq.${id}&select=encrypted_key`);
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  const rows = result.data as Array<{ encrypted_key: string }>;
  if (rows.length === 0) {
    return { success: false, error: "Key not found" };
  }
  
  try {
    const key = decrypt(rows[0].encrypted_key);
    return { success: true, key };
  } catch (error) {
    return { success: false, error: "Failed to decrypt key" };
  }
}

export async function deleteApiKeyFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  const configured = await isSupabaseConfigured();
  if (!configured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const result = await makeSupabaseRequest(`api_keys?id=eq.${id}`, "DELETE");
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  return { success: true };
}

export async function updateApiKeyInSupabase(
  id: string,
  updates: { key?: string; keyName?: string; metadata?: Record<string, string> }
): Promise<{ success: boolean; error?: string }> {
  const configured = await isSupabaseConfigured();
  if (!configured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.key) {
    updateData.encrypted_key = encrypt(updates.key);
  }
  if (updates.keyName !== undefined) {
    updateData.key_name = updates.keyName;
  }
  if (updates.metadata) {
    updateData.metadata = updates.metadata;
  }
  
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, error: "Supabase not configured" };
  }
  
  try {
    const response = await fetch(`${client.url}/rest/v1/api_keys?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": client.key,
        "Authorization": `Bearer ${client.key}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Update failed: ${errorText}` };
    }
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}


export async function supabaseTableSelect(endpoint: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const result = await makeSupabaseRequest(endpoint, "GET");
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function supabaseTableInsert(table: string, payload: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const result = await makeSupabaseRequest(table, "POST", payload);
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function supabaseTableUpdate(endpoint: string, payload: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { success: false, error: "Supabase not configured" };

  try {
    const response = await fetch(`${client.url}/rest/v1/${endpoint}`, {
      method: "PATCH",
      headers: {
        "apikey": client.key,
        "Authorization": `Bearer ${client.key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: await response.text() };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function supabaseTableDelete(endpoint: string): Promise<{ success: boolean; error?: string }> {
  const result = await makeSupabaseRequest(endpoint, "DELETE");
  if (result.error) return { success: false, error: result.error };
  return { success: true };
}

export async function migrateApiKeysToSupabase(existingKeys: {
  cerebras?: Array<{ id: string; key: string; name?: string }>;
  gemini?: Array<{ id: string; key: string; name?: string }>;
  imgbb?: Array<{ id: string; key: string; name?: string }>;
  freeimagehost?: Array<{ id: string; key: string; name?: string }>;
  serper?: Array<{ id: string; key: string; name?: string }>;
  blogger?: { client_id?: string; client_secret?: string; refresh_token?: string; blog_id?: string };
  tumblr?: { consumer_key?: string; consumer_secret?: string; token?: string; token_secret?: string };
  whatsapp?: { phoneNumber?: string; apiKey?: string };
}): Promise<{ success: boolean; migratedCount: number; errors: string[] }> {
  const configured = await isSupabaseConfigured();
  if (!configured) {
    return { success: false, migratedCount: 0, errors: ["Supabase not configured"] };
  }
  
  let migratedCount = 0;
  const errors: string[] = [];
  
  const migrateKeyArray = async (keyType: string, keys?: Array<{ id: string; key: string; name?: string }>) => {
    if (!keys) return;
    
    for (const k of keys) {
      const result = await storeApiKeyInSupabase(keyType, k.key, k.name, { originalId: k.id });
      if (result.success) {
        migratedCount++;
      } else {
        errors.push(`Failed to migrate ${keyType} key: ${result.error}`);
      }
    }
  };
  
  await migrateKeyArray("cerebras", existingKeys.cerebras);
  await migrateKeyArray("gemini", existingKeys.gemini);
  await migrateKeyArray("imgbb", existingKeys.imgbb);
  await migrateKeyArray("freeimagehost", existingKeys.freeimagehost);
  await migrateKeyArray("serper", existingKeys.serper);
  
  if (existingKeys.blogger) {
    const b = existingKeys.blogger;
    if (b.client_id) {
      const result = await storeApiKeyInSupabase("blogger", b.client_id, "client_id", { field: "client_id" });
      if (result.success) migratedCount++; else errors.push(`Failed to migrate blogger client_id: ${result.error}`);
    }
    if (b.client_secret) {
      const result = await storeApiKeyInSupabase("blogger", b.client_secret, "client_secret", { field: "client_secret" });
      if (result.success) migratedCount++; else errors.push(`Failed to migrate blogger client_secret: ${result.error}`);
    }
    if (b.refresh_token) {
      const result = await storeApiKeyInSupabase("blogger", b.refresh_token, "refresh_token", { field: "refresh_token" });
      if (result.success) migratedCount++; else errors.push(`Failed to migrate blogger refresh_token: ${result.error}`);
    }
  }
  
  if (existingKeys.tumblr) {
    const t = existingKeys.tumblr;
    if (t.consumer_key) {
      const result = await storeApiKeyInSupabase("tumblr", t.consumer_key, "consumer_key", { field: "consumer_key" });
      if (result.success) migratedCount++; else errors.push(`Failed to migrate tumblr consumer_key: ${result.error}`);
    }
    if (t.consumer_secret) {
      const result = await storeApiKeyInSupabase("tumblr", t.consumer_secret, "consumer_secret", { field: "consumer_secret" });
      if (result.success) migratedCount++; else errors.push(`Failed to migrate tumblr consumer_secret: ${result.error}`);
    }
    if (t.token) {
      const result = await storeApiKeyInSupabase("tumblr", t.token, "token", { field: "token" });
      if (result.success) migratedCount++; else errors.push(`Failed to migrate tumblr token: ${result.error}`);
    }
    if (t.token_secret) {
      const result = await storeApiKeyInSupabase("tumblr", t.token_secret, "token_secret", { field: "token_secret" });
      if (result.success) migratedCount++; else errors.push(`Failed to migrate tumblr token_secret: ${result.error}`);
    }
  }
  
  if (existingKeys.whatsapp?.apiKey) {
    const result = await storeApiKeyInSupabase("whatsapp", existingKeys.whatsapp.apiKey, "api_key", { 
      phoneNumber: existingKeys.whatsapp.phoneNumber || "" 
    });
    if (result.success) migratedCount++; else errors.push(`Failed to migrate whatsapp apiKey: ${result.error}`);
  }
  
  return { success: errors.length === 0, migratedCount, errors };
}

export { maskApiKey };
