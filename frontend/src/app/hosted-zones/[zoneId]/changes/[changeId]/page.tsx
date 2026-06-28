"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  ArrowLeft, 
  RefreshCw, 
  Info, 
  CheckCircle, 
  Clock,
  ExternalLink
} from "lucide-react";
import { showToast } from "@/components/ConsoleShell";

interface DNSChange {
  id: string;
  hosted_zone_id: string;
  status: string; // PENDING, INSYNC
  submitted_at: string;
  comment: string | null;
}

interface HostedZone {
  id: string;
  name: string;
  comment: string;
  private_zone: boolean;
}

export default function ChangeInfoPage() {
  const { zoneId, changeId } = useParams() as { zoneId: string; changeId: string };
  const router = useRouter();

  // States
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [change, setChange] = useState<DNSChange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      // Fetch zone details
      const zoneData = await api.zones.get(zoneId);
      setZone(zoneData);
      
      // Fetch change details
      const changeData = await api.changes.get(changeId);
      setChange(changeData);
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        showToast(err.message || "Failed to load change info details.", "error");
        router.push(`/hosted-zones/${zoneId}`);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    if (api.auth.isAuthenticated()) {
      loadData();
    }
  }, [zoneId, changeId]);

  // Polling check for PENDING -> INSYNC state transition
  useEffect(() => {
    if (!change || change.status !== "PENDING") return;

    const interval = setInterval(async () => {
      try {
        const updatedChange = await api.changes.get(changeId);
        setChange(updatedChange);
        if (updatedChange.status === "INSYNC") {
          showToast("DNS propagation complete! Status is now INSYNC.", "success");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [change, changeId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updatedChange = await api.changes.get(changeId);
      setChange(updatedChange);
      if (updatedChange.status === "INSYNC") {
        showToast("DNS propagation complete! Status is now INSYNC.", "success");
      } else {
        showToast("Change request status refreshed.", "info");
      }
    } catch (err: any) {
      showToast("Failed to refresh status.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      // Format as: November 17, 2023, 00:17 (UTC)
      const options: Intl.DateTimeFormatOptions = {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short"
      };
      return date.toLocaleDateString("en-US", options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-800 dark:text-slate-200">
      
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark pb-4 select-none">
        <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1">
          <Link href="/hosted-zones" className="hover:text-aws-blue transition-colors">Route 53</Link>
          <span>&gt;</span>
          <Link href="/hosted-zones" className="hover:text-aws-blue transition-colors">Hosted zones</Link>
          <span>&gt;</span>
          <Link href={`/hosted-zones/${zoneId}`} className="hover:text-aws-blue transition-colors font-mono">{zone?.name || zoneId}</Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Change Info</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-mono font-semibold text-slate-900 dark:text-white">{changeId}</h1>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-400 hover:text-aws-blue transition-colors">
            <Info size={14} className="mt-1" />
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md p-8 text-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-aws-orange border-t-transparent rounded-full animate-spin" />
            <span>Loading change request info...</span>
          </div>
        </div>
      ) : !change ? (
        <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md p-8 text-center text-slate-500">
          Change details not found.
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          
          {/* Change Info Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md overflow-hidden shadow-xs">
            
            {/* Card Header with Refresh button */}
            <div className="px-5 py-3.5 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800 flex items-center justify-between select-none">
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Change info details</h3>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Refresh details"
              >
                <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Grid display layout (Screenshot 5) */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-xs">
              
              <div className="space-y-1">
                <span className="text-slate-400 dark:text-slate-400 block font-semibold">ID</span>
                <span className="font-mono text-slate-900 dark:text-white select-all">/change/{change.id}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 dark:text-slate-400 block font-semibold">Submitted at</span>
                <span className="text-slate-900 dark:text-white">{formatDate(change.submitted_at)}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 dark:text-slate-400 block font-semibold">Status</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {change.status === "PENDING" ? (
                    <>
                      <div className="h-3.5 w-3.5 flex items-center justify-center text-amber-500 animate-pulse">
                        <Clock size={14} className="animate-spin duration-1000" />
                      </div>
                      <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">PENDING</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">INSYNC</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 dark:text-slate-400 block font-semibold">Comment</span>
                <span className="text-slate-800 dark:text-white font-mono">{change.comment || "—"}</span>
              </div>

            </div>
          </div>

          {/* Bottom Actions back link */}
          <div className="flex justify-start">
            <Link
              href={`/hosted-zones/${zoneId}`}
              className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer select-none"
            >
              <ArrowLeft size={13} />
              <span>Back to zone records</span>
            </Link>
          </div>

        </div>
      )}

    </div>
  );
}
