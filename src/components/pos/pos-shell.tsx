import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PosShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background overflow-hidden">
      {/* Top Header - Fixed Height */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Menu */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Title & Subtitle */}
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Header Actions (e.g., Profile, Notifications) */}
        {actions && (
          <div className="flex shrink-0 items-center gap-2 pl-2">
            {actions}
          </div>
        )}
      </header>

      {/* Main Content Area - Fills remaining height */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {children}
      </main>

      {/* Mobile Sidebar Overlay (Placeholder for your existing sidebar) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="relative z-50 flex h-full w-64 flex-col bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold text-sm">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Sidebar goes here */}
            <nav className="flex flex-col gap-2">
               {/* Your Navigation Links */}
               <div className="text-xs text-muted-foreground">Navigation items...</div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
