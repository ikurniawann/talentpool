import { requireUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const navItems =
    user.role === "hrd"
      ? [
          { href: "/dashboard", label: "Beranda", icon: "🏠" },
          { href: "/dashboard/candidates", label: "Kandidat", icon: "👥" },
          { href: "/dashboard/pipeline", label: "Pipeline", icon: "📋" },
          { href: "/dashboard/talent-pool", label: "Talent Pool", icon: "⭐" },
          { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
          { href: "/dashboard/settings", label: "Pengaturan", icon: "⚙️" },
        ]
      : user.role === "hiring_manager"
        ? [
            { href: "/dashboard", label: "Beranda", icon: "🏠" },
            { href: "/dashboard/candidates", label: "Kandidat", icon: "👥" },
            { href: "/dashboard/pipeline", label: "Pipeline", icon: "📋" },
            { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
          ]
        : // direksi
          [
            { href: "/dashboard", label: "Beranda", icon: "🏠" },
            { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
          ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">Talent Pool</h2>
          <p className="text-xs text-gray-500 mt-0.5">Aapex Technology</p>
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-700">{user.full_name}</p>
            <p className="text-xs text-blue-500 capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <form
            action={async () => {
              "use server";
              const { createClient } = await import("@/lib/supabase/server");
              const sb = await createClient();
              await sb.auth.signOut();
              redirect("/login");
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <span>🚪</span> Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
