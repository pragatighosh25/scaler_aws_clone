"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Network,
  Activity,
  Shuffle,
  Cpu,
  UserCheck,
  Sun,
  Moon,
  LogOut,
  Search,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  HelpCircle,
  User,
  ExternalLink,
  ChevronDown,
  CheckCircle,
  X
} from "lucide-react";

interface ConsoleShellProps {
  children: React.ReactNode;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function ConsoleShell({ children }: ConsoleShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [awsAccountId, setAwsAccountId] = useState("");
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [expandedHeaders, setExpandedHeaders] = useState<Record<string, boolean>>({
    "IP-based routing": true,
    "Traffic flow": true,
    "Domains": true,
    "Resolver": true,
    "DNS Firewall": true,
    "Application Recovery Controller": true
  });

  const toggleHeader = (headerName: string) => {
    setExpandedHeaders((prev) => ({
      ...prev,
      [headerName]: !prev[headerName],
    }));
  };

  // Listen to custom event for toasts so we can trigger them from child pages
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastMessage, "id">>;
      const newToast: ToastMessage = {
        id: Math.random().toString(),
        type: customEvent.detail.type,
        message: customEvent.detail.message,
      };
      setToasts((prev) => [...prev, newToast]);
      
      // Auto dismiss after 5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener("route53-toast", handleToastEvent);
    return () => window.removeEventListener("route53-toast", handleToastEvent);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    let keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search inputs
      if ((e.key === "/" || e.key.toLowerCase() === "s") && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input") || document.getElementById("search-input");
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }

      // Close drawers/modals on Escape
      if (e.key === "Escape") {
        setIsShortcutsModalOpen(false);
        window.dispatchEvent(new Event("route53-close-all"));
      }

      // Help modal shortcut
      if (e.key === "?" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        setIsShortcutsModalOpen((prev) => !prev);
      }

      // Track key combos (g then h, g then d)
      keysPressed[e.key.toLowerCase()] = true;

      if (keysPressed["g"]) {
        if (e.key.toLowerCase() === "h") {
          e.preventDefault();
          router.push("/hosted-zones");
          keysPressed = {};
        } else if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          router.push("/");
          keysPressed = {};
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      delete keysPressed[e.key.toLowerCase()];
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [router]);

  useEffect(() => {
    setMounted(true);
    // Check local storage for dark mode preference
    const storedDark = localStorage.getItem("route53_dark_mode") === "true";
    setIsDarkMode(storedDark);
    if (storedDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Check authentication
    if (pathname !== "/login") {
      if (!api.auth.isAuthenticated()) {
        router.push("/login");
      } else {
        setUsername(api.auth.getUsername());
        setAwsAccountId(api.auth.getAwsAccountId());
      }
    }
  }, [pathname, router]);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem("route53_dark_mode", String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSignOut = () => {
    api.auth.logout();
    router.push("/login");
  };

  if (!mounted) return null;

  // Render minimal layout for login page
  if (pathname === "/login") {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark transition-colors duration-200">
        {children}
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/" },
    { name: "Hosted zones", href: "/hosted-zones" },
    { name: "Health checks", href: "/coming-soon?service=Health%20Checks" },
    { name: "Profiles", href: "/coming-soon?service=Profiles", badge: "New" },
    {
      name: "IP-based routing",
      isHeader: true,
      subItems: [
        { name: "CIDR collections", href: "/coming-soon?service=CIDR%20Collections" }
      ]
    },
    {
      name: "Traffic flow",
      isHeader: true,
      subItems: [
        { name: "Traffic policies", href: "/coming-soon?service=Traffic%20Policies" },
        { name: "Policy records", href: "/coming-soon?service=Policy%20Records" }
      ]
    },
    {
      name: "Domains",
      isHeader: true,
      subItems: [
        { name: "Registered domains", href: "/coming-soon?service=Registered%20Domains" },
        { name: "Pending requests", href: "/coming-soon?service=Pending%20Requests" }
      ]
    },
    {
      name: "Resolver",
      isHeader: true,
      subItems: [
        { name: "VPCs", href: "/coming-soon?service=VPC%20Resolver" },
        { name: "Inbound endpoints", href: "/coming-soon?service=Inbound%20Endpoints" },
        { name: "Outbound endpoints", href: "/coming-soon?service=Outbound%20Endpoints" },
        { name: "Rules", href: "/coming-soon?service=Resolver%20Rules" },
        { name: "Query logging", href: "/coming-soon?service=Query%20Logging" },
        { name: "Outposts", href: "/coming-soon?service=Outposts" }
      ]
    },
    {
      name: "DNS Firewall",
      isHeader: true,
      subItems: [
        { name: "Rule groups", href: "/coming-soon?service=DNS%20Rule%20Groups" },
        { name: "Domain lists", href: "/coming-soon?service=DNS%20Domain%20Lists" }
      ]
    },
    {
      name: "Application Recovery Controller",
      isHeader: true,
      subItems: [
        { name: "Getting started", href: "/coming-soon?service=Application%20Recovery" }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark text-text-light-primary dark:text-text-dark-primary transition-colors duration-200">
      {/* Top AWS Header */}
      <header className="bg-aws-navy dark:bg-aws-navy-dark text-white h-12 flex items-center justify-between px-4 z-40 select-none shadow-md">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-90">
            {/* User-uploaded AWS transparent logo */}
            <img
              src="/amazon_logo_transparent.png"
              alt="AWS Logo"
              className="h-6 w-auto mr-1 select-none pointer-events-none"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <span className="font-semibold text-xs tracking-wide hidden sm:inline text-slate-300">
              Console Home
            </span>
          </Link>
          
          <div className="h-4 w-[1px] bg-slate-500 hidden sm:inline" />

          <Link href="/" className="font-semibold text-xs text-slate-100 hover:text-aws-orange transition-colors">
            Route 53
          </Link>
        </div>

        {/* Mock Search Bar */}
        <div className="hidden md:flex items-center bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded px-2.5 py-1 w-96 transition-all duration-200">
          <Search size={14} className="text-slate-400 mr-2" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search console (press '/' to focus)"
            className="bg-transparent text-xs text-white focus:outline-none w-full placeholder-slate-400"
          />
        </div>


        {/* Right Action Icons */}
        <div className="flex items-center gap-4 text-slate-300">
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <button className="p-1.5 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer hidden sm:block">
            <Bell size={16} />
          </button>

          <button 
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] uppercase font-bold"
            title="Keyboard Shortcuts (?)"
          >
            <span className="bg-slate-700 px-1 py-0.5 rounded text-slate-300 font-mono text-[9px] border border-slate-600">?</span>
          </button>

          <button className="p-1.5 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer hidden sm:block">
            <Settings size={16} />
          </button>

          <button className="p-1.5 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer">
            <HelpCircle size={16} />
          </button>

          <div className="h-4 w-[1px] bg-slate-600" />

          {/* User AWS Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold py-1 px-2 rounded hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <User size={14} className="text-aws-orange" />
              <span>{username} @ {awsAccountId}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isUserDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold block">My AWS Account</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block mt-0.5">Account ID: {awsAccountId}</span>
                  </div>
                  <button className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Billing Dashboard</span>
                    <ExternalLink size={10} />
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Security Credentials</span>
                    <ExternalLink size={10} />
                  </button>
                  <div className="h-[1px] bg-slate-100 dark:border-slate-700 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400 font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={12} />
                    <span>Sign Out of AWS Console</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>


      {/* Workspace Area: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <aside
          className={`bg-white dark:bg-slate-900 border-r border-border-light dark:border-border-dark flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-200 ${
            isSidebarOpen ? "w-64" : "w-12"
          }`}
        >
          <div className="overflow-y-auto overflow-x-hidden flex-1 py-3">
            {/* Sidebar Title */}
            {isSidebarOpen && (
              <div className="px-4 pb-4 mb-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Route 53 Navigation
                </span>
              </div>
            )}

            {/* Navigation Menu */}
            <nav className="space-y-1 px-2">
              {navItems.map((item) => {
                if (item.isHeader) {
                  const isExpanded = expandedHeaders[item.name] !== false;
                  return (
                    <div key={item.name} className="space-y-0.5 pt-1">
                      {isSidebarOpen ? (
                        <>
                          <button
                            onClick={() => toggleHeader(item.name)}
                            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="text-[8px] opacity-75">{isExpanded ? "▼" : "▶"}</span>
                              <span>{item.name}</span>
                            </span>
                          </button>
                          {isExpanded && item.subItems && (
                            <div className="ml-3 pl-2 border-l border-slate-150 dark:border-slate-800 space-y-0.5 mt-0.5">
                              {item.subItems.map((sub) => {
                                const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                                return (
                                  <Link
                                    key={sub.name}
                                    href={sub.href}
                                    className={`block px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                      isSubActive
                                        ? "bg-slate-100 dark:bg-slate-800 text-aws-blue dark:text-blue-400 font-bold"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                    }`}
                                  >
                                    {sub.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                      )}
                    </div>
                  );
                }

                // Regular top-level item
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                return (
                  <div key={item.name}>
                    <Link
                      href={item.href || "#"}
                      className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-slate-100 dark:bg-slate-800 text-aws-blue dark:text-blue-400 font-bold border-l-2 border-aws-orange"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      {isSidebarOpen && item.badge && (
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase select-none">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Toggle Sidebar Button */}
          <div className="p-2 border-t border-border-light dark:border-border-dark flex justify-end">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-border-light dark:border-border-dark text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0b0f19] transition-all duration-200">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full shadow-2xl p-6 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Keyboard Shortcuts Guide</span>
              </h3>
              <button 
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3.5 text-[11px]">
              <div className="grid grid-cols-3 items-center gap-y-3 gap-x-2">
                <span className="col-span-1 font-bold text-slate-400">Keys</span>
                <span className="col-span-2 font-bold text-slate-400">Action</span>
                
                <kbd className="col-span-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-center font-mono border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-semibold">?</kbd>
                <span className="col-span-2 text-slate-600 dark:text-slate-300">Toggle this shortcuts guide</span>

                <kbd className="col-span-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-center font-mono border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-semibold">/</kbd>
                <span className="col-span-2 text-slate-600 dark:text-slate-300">Focus search bar</span>

                <kbd className="col-span-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-center font-mono border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-semibold">g then h</kbd>
                <span className="col-span-2 text-slate-600 dark:text-slate-300">Go to Hosted Zones</span>

                <kbd className="col-span-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-center font-mono border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-semibold">g then d</kbd>
                <span className="col-span-2 text-slate-600 dark:text-slate-300">Go to Dashboard</span>

                <kbd className="col-span-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-center font-mono border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-semibold">Esc</kbd>
                <span className="col-span-2 text-slate-600 dark:text-slate-300">Close drawers / clear selections</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-150 dark:border-slate-800 pt-4 flex justify-end">
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="bg-aws-orange hover:bg-aws-orange-hover text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AWS-style Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-xl border flex items-start justify-between gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                : "bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
            }`}
          >
            <div className="flex gap-2">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="hover:opacity-70 transition-opacity cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// Global utility helper to dispatch a toast notification from anywhere
export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("route53-toast", {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }
}
