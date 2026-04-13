const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://jhmmhpbxiygpznhpaspy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44"
);

const DEMO_PASSWORD = "demo123456";

async function resetDemoPasswords() {
  const demoUsers = [
    { email: "demo@aapextechnology.com", id: "31824315-d19c-4419-ac46-6e61951e1ff9" },
    { email: "demohm@aapextechnology.com", id: "7ceba544-d4e4-4c03-9bf7-66deee384dfb" },
  ];

  for (const user of demoUsers) {
    console.log(`Updating password for: ${user.email}`);

    const { error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: DEMO_PASSWORD }
    );

    if (error) {
      console.log(`  Error: ${error.message}`);
    } else {
      console.log(`  Password updated to: ${DEMO_PASSWORD}`);
    }
  }

  console.log("\nDone!");
}

resetDemoPasswords();
