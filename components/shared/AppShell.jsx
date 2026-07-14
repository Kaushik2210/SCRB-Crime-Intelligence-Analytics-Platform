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
  Menu,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on route change so navigating never leaves it open.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
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

  // The mobile drawer always shows full labels regardless of the desktop
  // collapse preference — it's a temporary overlay, never icon-only. The
  // hamburger that sets mobileOpen is itself hidden on desktop (md:hidden),
  // so mobileOpen can only be true there via the mobile drawer.
  const iconOnly = collapsed && !mobileOpen;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} districts={districts} />

      {/* Backdrop for the mobile drawer — tapping it closes the sidebar. */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar: a sticky in-flow column on md+ screens, a slide-in overlay
          drawer below that. `fixed`/`sticky` (and the left-offset toggle) are
          driven by `max-md:`/`md:` variants that are mutually exclusive by
          media query, rather than relying on cascade order between a plain
          and a responsive utility — Tailwind doesn't guarantee the responsive
          one wins, which previously left the sidebar `position: fixed` (out
          of flow) at desktop widths too, overlapping the main content instead
          of pushing it over. Deliberately CSS-only (no JS viewport check):
          that avoids an SSR-vs-mobile hydration flash where the full desktop
          layout would flicker briefly before a client-side check corrected
          it. */}
      <aside
        className={cn(
          "max-md:fixed max-md:inset-y-0 max-md:z-40 md:sticky md:top-0 md:z-auto flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar max-md:transition-[left] md:transition-[width]",
          mobileOpen ? "max-md:left-0" : "max-md:-left-60",
          collapsed ? "md:w-[68px]" : "md:w-60"
        )}
        style={{ transitionDuration: "var(--duration-base)", transitionTimingFunction: "var(--ease-out-soft)" }}
      >
        <div className={cn("flex h-16 items-center gap-2 border-b border-sidebar-border px-4", iconOnly && "justify-center px-0")}>
          <ShieldCheck className="size-5 shrink-0 text-accent" />
          {!iconOnly ? (
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
                title={iconOnly ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  iconOnly && "justify-center px-0",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                ) : null}
                <item.icon className="size-4.5 shrink-0" />
                {!iconOnly ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2.5 md:block hidden">
          <Button
            variant="ghost"
            size={iconOnly ? "icon" : "default"}
            className="w-full justify-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={toggleCollapsed}
            title={iconOnly ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed ? <span>Collapse</span> : null}
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              title="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
            <Breadcrumb pathname={pathname ?? ""} />
          </div>

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
