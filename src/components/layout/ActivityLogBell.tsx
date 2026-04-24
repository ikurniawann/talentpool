"use client";

import { useState } from "react";
import { Bell, Trash2, CheckCheck, Package, Truck, Users, DollarSign, FileText, Archive, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PO: FileText,
  GRN: Truck,
  SUPPLIER: Users,
  RAW_MATERIAL: Package,
  PRODUCT: Package,
  PRICE_LIST: DollarSign,
  DELIVERY: Truck,
  RETURN: Archive,
  INVENTORY: Archive,
};

const TYPE_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  STATUS_CHANGE: "bg-orange-100 text-orange-700",
  APPROVE: "bg-purple-100 text-purple-700",
  REJECT: "bg-gray-100 text-gray-700",
};

export function ActivityLogBell() {
  const { logs, unreadCount, markAsRead, markAllAsRead, clearAll } = useActivityLog();
  const [open, setOpen] = useState(false);

  const handleLogClick = (logId: string) => {
    markAsRead(logId);
  };

  const handleClearAll = () => {
    clearAll();
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <button className="relative h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-[500px] p-0 z-50 shadow-2xl border-gray-200 bg-white" 
        sideOffset={8}
        avoidCollisions
        collisionPadding={16}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50 sticky top-0 z-10">
          <div>
            <h3 className="text-sm font-semibold">Activity Log</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
            </p>
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMarkAllRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700"
                onClick={handleClearAll}
                title="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div className="max-h-[400px] overflow-y-auto bg-white">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your recent actions will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const IconComponent = MODULE_ICONS[log.module] || Package;
                const timeAgo = formatDistanceToNow(new Date(log.timestamp), {
                  addSuffix: true,
                  locale: id,
                });

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                      !log.isRead && "bg-muted/30"
                    )}
                    onClick={() => handleLogClick(log.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          TYPE_COLORS[log.type]
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{log.title}</p>
                          {!log.isRead && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {log.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                        {log.recordNumber && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {log.recordNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
