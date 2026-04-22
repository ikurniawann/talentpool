const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://jhmmhpbxiygpznhpaspy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44"
);

async function checkUsers() {
  console.log("=== All Users in Database ===\n");
  
  const { data: users, error } = await supabase
    .from("users")
    .select("id, full_name, role, brand_id, created_at");
    
  if (error) {
    console.log("Error:", error.message);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log("No users found in database");
    return;
  }
  
  users.forEach(u => {
    console.log(`Role: ${u.role}`);
    console.log(`Name: ${u.full_name}`);
    console.log(`ID: ${u.id}`);
    console.log(`Created: ${u.created_at}`);
    console.log("---");
  });
  
  // Get auth users too
  console.log("\n=== Auth Users ===\n");
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  
  if (authErr) {
    console.log("Auth error:", authErr.message);
    return;
  }
  
  authData.users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`ID: ${u.id}`);
    console.log(`---`);
  });
}

checkUsers();
