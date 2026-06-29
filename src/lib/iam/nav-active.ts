/**
 * Sidebar active-state helper.
 * Prevents generic paths (e.g. /dashboard/settings) from staying active
 * when a sibling has a more specific match (e.g. /dashboard/settings/users).
 */
export function isNavLinkActive(
  pathname: string,
  href: string,
  peerHrefs: string[] = []
): boolean {
  if (pathname === href) return true;

  if (!pathname.startsWith(`${href}/`)) return false;

  const blockedByPeer = peerHrefs.some((peer) => {
    if (peer === href || peer.length <= href.length) return false;
    if (!peer.startsWith(`${href}/`)) return false;
    return pathname === peer || pathname.startsWith(`${peer}/`);
  });

  return !blockedByPeer;
}

/** Known duplicate route_path prefixes in IAM seed (informational). */
export const DUPLICATE_ROUTE_GROUPS = [
  {
    prefix: "/dashboard/settings",
    items: ["settings (group)", "settings.general", "settings.users", "settings.menus", "settings.roles"],
  },
  {
    prefix: "/dashboard/employees",
    items: ["hris.employees (group)", "hris.employees.all"],
  },
  {
    prefix: "/dashboard/purchasing/grn",
    items: ["purchasing.grn.group", "purchasing.grn"],
  },
  {
    prefix: "/dashboard/purchasing/suppliers",
    items: ["purchasing.suppliers.group", "purchasing.suppliers"],
  },
  {
    prefix: "/dashboard/inventory",
    items: ["inventory (group)", "inventory.dashboard"],
  },
  {
    prefix: "/dashboard/pos",
    items: ["pos (group)", "pos.dashboard"],
  },
  {
    prefix: "/dashboard/crm",
    items: ["crm (group)", "crm.membership"],
  },
] as const;
