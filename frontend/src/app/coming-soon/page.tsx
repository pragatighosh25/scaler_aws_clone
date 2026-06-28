"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, ArrowLeft, ExternalLink } from "lucide-react";

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const service = searchParams.get("service") || "Feature";

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark pb-4">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">{service}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Replicating the Route 53 AWS Console layout.
        </p>
      </div>

      {/* Warning Alert Panel */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-5 flex items-start gap-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-amber-700 dark:text-amber-400 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {service} feature is not fully implemented in this clone.
          </h3>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed max-w-4xl">
            In a production AWS environment, this page provides configuration dashboards for {service.toLowerCase()}. For this assignment scope, this section is mocked. All CRUD storage and retrieval are fully supported for <strong>Hosted Zones</strong> and <strong>DNS Records</strong>.
          </p>
        </div>
      </div>

      {/* Mock details card */}
      <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Clock size={16} className="text-slate-400" />
          <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400">Feature Description (AWS Console Specification)</h4>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
          <p>
            AWS Route53 provides comprehensive workflows for {service}. This includes managing high-volume enterprise traffic routing, visual maps, inbound/outbound DNS query routing through endpoints, and integration with AWS IAM policies.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <li>Integrates directly with AWS CloudWatch alarms.</li>
            <li>Enforces multi-region traffic failover routing protocols.</li>
            <li>Configures internal resolution parameters inside user-allocated Virtual Private Clouds (VPC).</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-border-light dark:border-border-dark flex items-center gap-4">
          <Link
            href="/"
            className="border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-1.5 px-3 rounded shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={12} />
            <span>Return to Dashboard</span>
          </Link>
          <a
            href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-aws-blue hover:text-aws-blue-hover dark:text-blue-400 font-semibold inline-flex items-center gap-1 hover:underline"
          >
            <span>Learn more in AWS Route 53 Developer Guide</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 border-2 border-aws-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  );
}
