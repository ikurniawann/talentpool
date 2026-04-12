const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://jhmmhpbxiygpznhpaspy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44"
);

async function upsertDemoProfiles() {
  // These users already exist in Auth — we just need to upsert their profiles
  const profiles = [
    { email: "demo@aapextechnology.com", full_name: "Demo HRD", role: "hrd" },
    { email: "demohm@aapextechnology.com", full_name: "Demo Hiring Manager", role: "hiring_manager" },
  ];

  for (const p of profiles) {
    console.log("Upserting profile for:", p.email);

    // Find user by email in auth.users (list users)
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();

    if (listErr) {
      console.log("  List users error:", listErr.message);
      continue;
    }

    const authUser = users?.users?.find((u) => u.email === p.email);

    if (!authUser) {
      console.log("  Auth user not found for:", p.email);
      continue;
    }

    console.log("  Auth ID:", authUser.id);

    const { error: profErr } = await supabase.from("users").upsert({
      id: authUser.id,
      full_name: p.full_name,
      role: p.role,
      brand_id: null,
    });

    if (profErr) {
      console.log("  Profile upsert error:", profErr.message);
    } else {
      console.log("  Profile upsert: OK");
    }
  }

  console.log("\nDone!");
}

upsertDemoProfiles();

