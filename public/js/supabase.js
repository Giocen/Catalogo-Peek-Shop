import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://drozwvfguvqolprnpxxv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb3p3dmZndXZxb2xwcm5weHh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxMzMxNywiZXhwIjoyMDg0ODg5MzE3fQ.zC1uopRKwmWPhDUVduY-3P_WJAuBzJwHJJCpz_B81uA"
);