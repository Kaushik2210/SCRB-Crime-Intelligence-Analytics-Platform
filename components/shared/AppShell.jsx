"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { CommandPalette } from "@/components/shared/CommandPalette";
import {
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Network,
  TrendingUp,
  Bell,
  Search,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  Table2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/network", label: "Network Analysis", icon: Network },
  { href: "/risk", label: "Predictive Risk", icon: TrendingUp },
  { href: "/alerts", label: "Alerts & Trends", icon: Bell },
  { href: "/cases", label: "Case Records", icon: Table2 },
];

const BREADCRUMB_LABELS = {
  dashboard: "Dashboard",
  network: "Network Analysis",
  risk: "Predictive Risk",
  alerts: "Alerts & Trends",
  districts: "Districts",
  cases: "Case Records",
};

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("ksp-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);
  function toggle() {
    setCollapsed((prev) => {
      window.localStorage.setItem("ksp-sidebar-collapsed", String(!prev));
      return !prev;
    });
  }
  return [collapsed, toggle];
}

function Breadcrumb({ pathname }) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return <span className="text-sm font-medium text-foreground">Dashboard</span>;

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const label = BREADCRUMB_LABELS[seg] ?? (isNaN(Number(seg)) ? seg : `District ${seg}`);
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-muted-foreground/50">/</span> : null}
            <span className={isLast ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
          </span>
        );
      })}
    </nav>
  );
}

export function AppShell({ user, alerts = [], districts = [], children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [commandOpen, setCommandOpen] = useState(false);
  // next-themes can't know the resolved theme during SSR; wait for mount before
  // rendering a theme-dependent icon to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} districts={districts} />

      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-base",
          collapsed ? "w-[68px]" : "w-60"
        )}
        style={{ transitionTimingFunction: "var(--ease-out-soft)" }}
      >
        <div className={cn("flex h-16 items-center gap-2 border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
          <ShieldCheck className="size-5 shrink-0 text-accent" />
          {!collapsed ? (
            <span className="truncate font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">
              SCRB Intelligence
            </span>
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                ) : null}
                <item.icon className="size-4.5 shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2.5">
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className="w-full justify-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed ? <span>Collapse</span> : null}
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <Breadcrumb pathname={pathname ?? ""} />

          <div className="flex flex-1 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 sm:flex"
            >
              <Search className="size-3.5" />
              <span>Search…</span>
              <kbd className="ml-4 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
                Ctrl/⌘K
              </kbd>
            </button>
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setCommandOpen(true)}>
              <Search className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="relative" title="Notifications">
                    <Bell className="size-4" />
                    {alerts.length > 0 ? (
                      <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />
                    ) : null}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Recent alerts</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {alerts.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nothing new right now.</p>
                  ) : (
                    alerts.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        className="flex-col items-start gap-1 whitespace-normal py-2"
                        onClick={() => router.push("/alerts")}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {item.districtName ?? "Statewide"}
                          </span>
                          <SeverityBadge tier={item.tier} />
                        </div>
                        <p className="text-xs leading-snug text-foreground">{item.message}</p>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button type="button" className="flex items-center gap-2 rounded-full outline-none">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.designationName} · {user.isStateLevel ? "Statewide" : user.districtName}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
