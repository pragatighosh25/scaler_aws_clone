"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Info, HelpCircle } from "lucide-react";
import { showToast } from "@/components/ConsoleShell";

export default function CreateHostedZonePage() {
  const router = useRouter();

  // Form states
  const [domainName, setDomainName] = useState("");
  const [comment, setComment] = useState("");
  const [privateZone, setPrivateZone] = useState(false);
  const [vpcId, setVpcId] = useState("");
  const [vpcRegion, setVpcRegion] = useState("us-east-1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.zones.create(
        domainName,
        comment,
        privateZone,
        privateZone ? vpcId : undefined,
        privateZone ? vpcRegion : undefined
      );
      showToast("Hosted zone created successfully.", "success");
      
      // If a change request ID is returned, redirect the user to the Change Details page!
      // This is a premium addition matching Screenshot 5!
      if (res && res.change_id) {
        router.push(`/hosted-zones/${res.id}/changes/${res.change_id}`);
      } else {
        router.push(`/hosted-zones/${res.id}`);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create hosted zone.", "error");
    } finally {
      setIsSubmitting(false);
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
          <span className="font-semibold text-slate-700 dark:text-slate-300">Create hosted zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Create hosted zone</h1>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-400 hover:text-aws-blue transition-colors">
            <Info size={14} className="mt-1" />
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        
        {/* Hosted Zone Configuration Card */}
        <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md p-6 shadow-xs space-y-6">
          
          <div className="space-y-1.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Hosted zone configuration</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              A hosted zone is a container that holds information about how you want to route traffic for a domain, such as example.com, and its subdomains.
            </p>
          </div>

          {/* Domain name field */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
              Domain name{" "}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-aws-blue dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1 font-normal">
                Info
              </a>
            </label>
            <p className="text-[10px] text-slate-500">This is the name of the domain that you want to route traffic for.</p>
            <input
              type="text"
              required
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="example.com"
              className="w-full max-w-lg py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white font-mono"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              Valid characters: a-z, 0-9, ! &quot; # $ % &amp; &apos; ( ) * + , - / : ; &lt; = &gt; ? @ [ \ ] ^ _ ` &#123; | &#125; . ~
            </p>
          </div>

          {/* Description field */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
              Description - <span className="italic font-normal">optional</span>{" "}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-aws-blue dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1 font-normal">
                Info
              </a>
            </label>
            <p className="text-[10px] text-slate-500">This value lets you distinguish hosted zones that have the same name.</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 256))}
              placeholder="The hosted zone is used for..."
              rows={3}
              maxLength={256}
              className="w-full max-w-lg py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              The description can have up to 256 characters. <strong className="font-mono">{comment.length}/256</strong>
            </p>
          </div>

          {/* Type radio cards */}
          <div className="space-y-3">
            <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
              Type{" "}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-aws-blue dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1 font-normal">
                Info
              </a>
            </label>
            <p className="text-[10px] text-slate-500">The type indicates whether you want to route traffic on the internet or in an Amazon VPC.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              {/* Public Card */}
              <label 
                className={`border p-4 rounded cursor-pointer transition-all flex items-start gap-3 select-none ${
                  !privateZone 
                    ? "border-aws-blue dark:border-blue-500 bg-sky-50/10 ring-1 ring-aws-blue dark:ring-blue-500" 
                    : "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="zoneType"
                  checked={!privateZone}
                  onChange={() => setPrivateZone(false)}
                  className="mt-1 text-aws-orange focus:ring-aws-orange cursor-pointer"
                />
                <div className="space-y-1">
                  <span className="font-bold block text-slate-900 dark:text-white">Public hosted zone</span>
                  <span className="text-slate-500 dark:text-slate-400 leading-normal block text-[10px]">
                    A public hosted zone determines how traffic is routed on the internet.
                  </span>
                </div>
              </label>

              {/* Private Card */}
              <label 
                className={`border p-4 rounded cursor-pointer transition-all flex items-start gap-3 select-none ${
                  privateZone 
                    ? "border-aws-blue dark:border-blue-500 bg-sky-50/10 ring-1 ring-aws-blue dark:ring-blue-500" 
                    : "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="zoneType"
                  checked={privateZone}
                  onChange={() => setPrivateZone(true)}
                  className="mt-1 text-aws-orange focus:ring-aws-orange cursor-pointer"
                />
                <div className="space-y-1">
                  <span className="font-bold block text-slate-900 dark:text-white">Private hosted zone</span>
                  <span className="text-slate-500 dark:text-slate-400 leading-normal block text-[10px]">
                    A private hosted zone determines how traffic is routed within an Amazon VPC.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* VPC configuration options (conditionally visible) */}
          {privateZone && (
            <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded space-y-4 animate-in fade-in-50 duration-150 max-w-2xl">
              <h3 className="font-bold text-slate-900 dark:text-white">VPC Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">VPC Region</label>
                  <select
                    value={vpcRegion}
                    onChange={(e) => setVpcRegion(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white"
                  >
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                    <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">VPC ID</label>
                  <input
                    type="text"
                    required={privateZone}
                    placeholder="vpc-0123456789abcdef0"
                    value={vpcId}
                    onChange={(e) => setVpcId(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Cancel and Submit Actions */}
        <div className="flex justify-end gap-2.5">
          <Link
            href="/hosted-zones"
            className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded transition-colors cursor-pointer select-none"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !domainName.trim()}
            className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-bold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {isSubmitting ? (
              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>Create hosted zone</span>
          </button>
        </div>

      </form>
    </div>
  );
}
