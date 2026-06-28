"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Globe, 
  Settings, 
  HelpCircle, 
  ExternalLink, 
  RefreshCw, 
  Info,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { showToast } from "@/components/ConsoleShell";

export default function DashboardPage() {
  const [hostedZoneCount, setHostedZoneCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [domainToCheck, setDomainToCheck] = useState("");
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainCheckResult, setDomainCheckResult] = useState<string | null>(null);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const zones = await api.zones.list();
        setHostedZoneCount(zones.length);
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
        setHostedZoneCount(0);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (api.auth.isAuthenticated()) {
      fetchStats();
    }
  }, []);

  const handleCheckDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainToCheck.trim()) return;

    setIsCheckingDomain(true);
    setDomainCheckResult(null);

    setTimeout(() => {
      setIsCheckingDomain(false);
      const cleaned = domainToCheck.trim().toLowerCase();
      // Simple validation check
      if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/.test(cleaned)) {
        setDomainCheckResult("invalid");
      } else {
        // Random availability
        const isAvailable = Math.random() > 0.4;
        setDomainCheckResult(isAvailable ? "available" : "unavailable");
      }
    }, 800);
  };

  const handleRefreshNotifications = () => {
    setIsNotificationsLoading(true);
    setTimeout(() => {
      setIsNotificationsLoading(false);
      showToast("Notifications successfully refreshed.", "success");
    }, 600);
  };

  return (
    <div className="space-y-6 text-xs text-slate-800 dark:text-slate-200">
      
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark pb-4 select-none">
        <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1">
          <span>Route 53</span>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Route 53 Dashboard</h1>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-400 hover:text-aws-blue transition-colors">
            <Info size={14} className="mt-1" />
          </a>
        </div>
      </div>

      {/* Main Core DNS Management Row (Replicating Screenshot 3) */}
      <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md p-6 shadow-xs space-y-6">
        
        {/* Row of 4 Management Service Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* DNS Management */}
          <div className="flex flex-col justify-between items-center text-center space-y-4">
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">DNS management</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-xs">
                A hosted zone tells Route 53 how to respond to DNS queries for a domain such as example.com.
              </p>
            </div>
            <Link 
              href="/hosted-zones/create"
              className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded font-semibold transition-colors cursor-pointer select-none"
            >
              Create hosted zone
            </Link>
          </div>

          {/* Traffic Management */}
          <div className="flex flex-col justify-between items-center text-center space-y-4">
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Traffic management</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-xs">
                A visual tool that lets you easily create policies for multiple endpoints in complex configurations.
              </p>
            </div>
            <Link 
              href="/coming-soon?service=Traffic%20Policies"
              className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded font-semibold transition-colors cursor-pointer select-none"
            >
              Create policy
            </Link>
          </div>

          {/* Availability Monitoring */}
          <div className="flex flex-col justify-between items-center text-center space-y-4">
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Availability monitoring</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-xs">
                Health checks monitor your applications and web resources, and direct DNS queries to healthy resources.
              </p>
            </div>
            <Link 
              href="/coming-soon?service=Health%20Checks"
              className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded font-semibold transition-colors cursor-pointer select-none"
            >
              Create health check
            </Link>
          </div>

          {/* Domain Registration */}
          <div className="flex flex-col justify-between items-center text-center space-y-4">
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Domain registration</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-xs">
                A domain is the name, such as example.com, that your users use to access your application.
              </p>
            </div>
            <a 
              href="#register-domain"
              className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded font-semibold transition-colors cursor-pointer select-none"
            >
              Register domain
            </a>
          </div>

        </div>

        {/* Readiness and Routing Control details (indented below cards) */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col sm:flex-row items-center justify-center gap-12 text-center">
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Readiness check</h4>
            <span className="text-xl font-bold block text-slate-800 dark:text-white">0</span>
            <Link href="/coming-soon?service=Readiness%20Checks" className="text-aws-blue hover:text-aws-blue-hover dark:text-blue-400 hover:underline">
              Readiness checks
            </Link>
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Routing control</h4>
            <span className="text-xl font-bold block text-slate-800 dark:text-white">0</span>
            <Link href="/coming-soon?service=Routing%20Control" className="text-aws-blue hover:text-aws-blue-hover dark:text-blue-400 hover:underline">
              Control panels
            </Link>
          </div>
        </div>

      </div>

      {/* Register Domain card (Screenshot 3) */}
      <div id="register-domain" className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800 select-none">
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Register domain</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
            Find and register an available domain, or <a href="#" onClick={(e) => e.preventDefault()} className="text-aws-blue dark:text-blue-400 hover:underline">transfer your existing domains</a> to Route 53.
          </p>

          <form onSubmit={handleCheckDomain} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <input
              type="text"
              placeholder="Enter a domain name"
              value={domainToCheck}
              onChange={(e) => setDomainToCheck(e.target.value)}
              className="flex-1 py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white font-mono"
            />
            <button
              type="submit"
              disabled={isCheckingDomain || !domainToCheck.trim()}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-150 border border-border-light dark:border-border-dark text-xs font-semibold px-5 py-1.5 rounded cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            >
              {isCheckingDomain ? "Checking..." : "Check"}
            </button>
          </form>

          {/* Domain results messaging */}
          {domainCheckResult && (
            <div className="mt-2 text-xs">
              {domainCheckResult === "available" && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle size={14} />
                  <span>The domain name is available for registration! (Simulated)</span>
                </div>
              )}
              {domainCheckResult === "unavailable" && (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                  <AlertTriangle size={14} />
                  <span>The domain name is already registered. Try another name.</span>
                </div>
              )}
              {domainCheckResult === "invalid" && (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                  <AlertTriangle size={14} />
                  <span>Please enter a valid domain name e.g. domain.com.</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-4xl leading-relaxed">
            Each label (each part between dots) can be up to 63 characters long and must start with a-z or 0-9. Maximum length: 255 characters, including dots. Valid characters: a-z, 0-9, and - (hyphen).
          </p>
        </div>
      </div>

      {/* Notifications Card (Screenshot 3) */}
      <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800 flex items-center justify-between select-none">
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Notifications</h3>
          <button
            onClick={handleRefreshNotifications}
            disabled={isNotificationsLoading}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw size={13} className={isNotificationsLoading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="p-5 text-center text-slate-500 dark:text-slate-400 text-xs py-8">
          There are no notifications at this time.
        </div>
      </div>

    </div>
  );
}
