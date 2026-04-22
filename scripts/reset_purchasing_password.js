const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://jhmmhpbxiygpznhpaspy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44"
);

const NEW_PASSWORD = "demo123456";

async function resetPurchasingPasswords() {
  const purchasingUsers = [
    { email: "admin.purchasing@aapextechnology.com", id: "0bb9f24e-89f8-4476-8da0-374addf32948" },
    { email: "purchase@aapextechnology.com", id: "8fc486da-f8ce-46e6-b1c3-d168c63a3a45" },
  ];

  for (const user of purchasingUsers) {
    console.log(`Updating password for: ${user.email}`);

    const { error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: NEW_PASSWORD }
    );

    if (error) {
      console.log(`  Error: ${error.message}`);
    } else {
      console.log(`  Password updated to: ${NEW_PASSWORD}`);
    }
  }

  console.log("\nDone!");
}

resetPurchasingPasswords();
