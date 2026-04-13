const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://jhmmhpbxiygpznhpaspy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44"
);

const DEMO_PASSWORD = "demo123456";

async function setupDemoUsers() {
  const demoUsers = [
    { email: "demo@aapextechnology.com", full_name: "Demo HRD", role: "hrd" },
    { email: "demohm@aapextechnology.com", full_name: "Demo Hiring Manager", role: "hiring_manager" },
  ];

  for (const user of demoUsers) {
    console.log(`\nProcessing: ${user.email}`);

    // 1. Check if user exists in Auth
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();

    if (listErr) {
      console.log("  List users error:", listErr.message);
      continue;
    }

    const authUser = users?.users?.find((u) => u.email === user.email);

    if (!authUser) {
      // 2. Create user in Auth
      console.log("  Creating Auth user...");
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: user.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });

      if (createErr) {
        console.log("  Create user error:", createErr.message);
        continue;
      }

      console.log("  Auth user created:", newUser.user.id);

      // 3. Upsert profile
      const { error: profErr } = await supabase.from("users").upsert({
        id: newUser.user.id,
        full_name: user.full_name,
        role: user.role,
        brand_id: null,
      });

      if (profErr) {
        console.log("  Profile upsert error:", profErr.message);
      } else {
        console.log("  Profile upsert: OK");
      }
    } else {
      console.log("  Auth user already exists:", authUser.id);

      // Profile might still need upsert
      const { error: profErr } = await supabase.from("users").upsert({
        id: authUser.id,
        full_name: user.full_name,
        role: user.role,
        brand_id: null,
      });

      if (profErr) {
        console.log("  Profile upsert error:", profErr.message);
      } else {
        console.log("  Profile upsert: OK");
      }
    }
  }

  console.log("\nDone!");
}

setupDemoUsers();

