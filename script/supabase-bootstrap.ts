const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!mgmtToken || !projectRef || !supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required env vars: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const setupSql = `
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
CREATE POLICY "Enable all access for service role" ON topics FOR ALL USING (true) WITH CHECK (true);
`;

async function runSql(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mgmtToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`SQL failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

async function rest(path: string, init?: RequestInit) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`REST failed (${res.status}) for ${path}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function crudCheck() {
  console.log("Running CRUD checks...");

  const sd = await rest("storage_documents", {
    method: "POST",
    body: JSON.stringify({ doc_type: "phase2", doc_key: "doc-a", payload: { a: 1 } }),
  });
  const sdId = sd[0].id;
  await rest(`storage_documents?id=eq.${sdId}`, { method: "PATCH", body: JSON.stringify({ payload: { a: 2 } }) });
  await rest(`storage_documents?id=eq.${sdId}&select=id,doc_type,doc_key,payload`);
  await rest(`storage_documents?id=eq.${sdId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

  const st = await rest("settings", {
    method: "POST",
    body: JSON.stringify({ setting_key: "phase2-setting", setting_value: { enabled: true } }),
  });
  await rest("settings?setting_key=eq.phase2-setting&select=setting_key,setting_value");
  await rest("settings?setting_key=eq.phase2-setting", { method: "PATCH", body: JSON.stringify({ setting_value: { enabled: false } }) });
  await rest("settings?setting_key=eq.phase2-setting", { method: "DELETE", headers: { Prefer: "return=minimal" } });

  const sch = await rest("schedules", {
    method: "POST",
    body: JSON.stringify({ channel: "video", target_id: "fb_page_1", schedule_time: "09:30:00", timezone: "UTC", metadata: { phase: 2 } }),
  });
  const schId = sch[0].id;
  await rest(`schedules?id=eq.${schId}&select=id,channel,schedule_time,is_enabled`);
  await rest(`schedules?id=eq.${schId}`, { method: "PATCH", body: JSON.stringify({ is_enabled: false }) });
  await rest(`schedules?id=eq.${schId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

  const t1 = await rest("topics", {
    method: "POST",
    body: JSON.stringify({ niche: "general", topic: "Hook test topic", normalized_topic: "hook-test-topic-phase2", source: "manual", used_for: "text" }),
  });
  const tId = t1[0].id;
  await rest(`topics?id=eq.${tId}&select=id,topic,normalized_topic`);
  await rest(`topics?id=eq.${tId}`, { method: "PATCH", body: JSON.stringify({ topic: "Hook test topic updated" }) });
  await rest(`topics?id=eq.${tId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

  console.log("CRUD checks complete");
}

async function verifySchema() {
  const sql = `
select table_name from information_schema.tables where table_schema='public' and table_name in ('api_keys','storage_documents','settings','schedules','topics') order by table_name;
select indexname from pg_indexes where schemaname='public' and indexname in ('idx_api_keys_key_type','idx_storage_documents_type_key','idx_schedules_channel_enabled','idx_topics_niche_created') order by indexname;
`;
  const result = await runSql(sql);
  console.log("Schema verification:", JSON.stringify(result));
}

(async () => {
  console.log("Applying schema...");
  await runSql(setupSql);
  await verifySchema();
  await crudCheck();
  console.log("Supabase bootstrap + verification done");
})();
