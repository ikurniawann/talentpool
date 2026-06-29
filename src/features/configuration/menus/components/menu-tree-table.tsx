"use client";

import { EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { NavIconName } from "@/lib/iam/types";
import { AppSidebarNavIcon } from "@/components/shared/app-sidebar-nav-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow } from "@/components/ui/table";
import type { MenuItem } from "../types";
import type { FlatMenuTreeRow } from "../utils/menu-tree";

const VALID_ICONS = new Set<string>([
  "home", "users", "clipboard", "star", "chart", "settings", "logout", "briefcase",
  "shopping", "cube", "pr", "po", "reports", "sitemap", "database", "building",
  "identification", "calendar", "dollar-sign", "money", "user-plus", "file-text",
  "chart-bar", "plus", "paper-airplane", "check-circle", "chart-pie",
  "arrow-down-on-square", "truck", "document-magnifying-glass", "circle-stack",
  "document-text", "clipboard-document-check",
]);

function toNavIcon(icon: string | null): NavIconName {
  if (icon && VALID_ICONS.has(icon)) return icon as NavIconName;
  return "clipboard";
}

function MenuTreeGuides({
  depth,
  isLast,
  parentContinuations,
}: {
  depth: number;
  isLast: boolean;
  parentContinuations: boolean[];
}) {
  if (depth === 0) return null;

  return (
    <span className="flex shrink-0 items-stretch" aria-hidden>
      {parentContinuations.map((continues, index) => (
        <span key={index} className="relative flex w-5 justify-center">
          {continues ? (
            <span className="absolute bottom-0 top-0 w-px bg-gray-300/90" />
          ) : null}
        </span>
      ))}
      <span className="relative flex w-5 items-center justify-center">
        <span className="absolute bottom-1/2 left-1/2 top-0 w-px bg-gray-300/90" />
        <span className="absolute left-1/2 top-1/2 h-px w-2.5 bg-gray-300/90" />
        <span className="relative z-1 font-mono text-[13px] leading-none text-gray-400">
          {isLast ? "└" : "├"}
        </span>
      </span>
    </span>
  );
}

interface MenuTreeTableProps {
  rows: FlatMenuTreeRow[];
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggleExpand: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

export function MenuTreeTable({
  rows,
  expandedIds,
  selectedId,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
}: MenuTreeTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <TableRow className="border-b border-gray-200/70 bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500 hover:bg-gray-50/80">
            <th className="px-4 py-3 text-left font-semibold">Menu</th>
            <th className="px-4 py-3 text-left font-semibold">Icon</th>
            <th className="px-4 py-3 text-left font-semibold">URL Path</th>
            <th className="px-4 py-3 text-left font-semibold">Module</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">Order</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </TableRow>
        </thead>
        <tbody className="divide-y divide-gray-200/50">
          {rows.map(({ item, depth, hasChildren, isLast, parentContinuations }) => {
            const isExpanded = expandedIds.has(item.id);
            const isGroup = item.menuType === "group" || hasChildren;

            return (
              <TableRow
                key={item.id}
                className={`transition-colors hover:bg-gray-50/80 ${
                  selectedId === item.id ? "bg-pink-50/60" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-[220px] items-center gap-1.5">
                    <MenuTreeGuides
                      depth={depth}
                      isLast={isLast}
                      parentContinuations={parentContinuations}
                    />
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => onToggleExpand(item.id)}
                        className="shrink-0 rounded p-0.5 text-[10px] font-bold leading-none text-gray-400 hover:bg-gray-200/70 hover:text-gray-600"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? "−" : "+"}
                      </button>
                    ) : (
                      <span className="inline-block w-4 shrink-0" aria-hidden />
                    )}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <AppSidebarNavIcon
                        name={toNavIcon(item.icon)}
                        className="h-4 w-4"
                        isActive={false}
                      />
                    </span>
                    <span
                      className={`truncate text-gray-900 ${
                        isGroup ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {item.menuName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-pink-600">
                    {item.icon ?? "—"}
                  </span>
                </td>
                <td
                  className="max-w-[240px] truncate px-4 py-3 text-gray-600"
                  title={item.routePath ?? undefined}
                >
                  {item.routePath ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{item.module ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {item.menuType}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.orderNumber}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      item.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer p-1.5 text-gray-600"
                      aria-label={`View details for ${item.menuName}`}
                      onClick={() => onView(item.id)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer p-1.5 text-blue-600"
                      aria-label={`Edit ${item.menuName}`}
                      onClick={() => onEdit(item)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer p-1.5 text-red-500 hover:text-red-600"
                      aria-label={`Delete ${item.menuName}`}
                      onClick={() => onDelete(item)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </TableRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
