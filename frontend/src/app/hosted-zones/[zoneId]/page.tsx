"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Search,
  X,
  RefreshCw,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Info,
  ExternalLink
} from "lucide-react";
import { showToast } from "@/components/ConsoleShell";

interface DNSRecord {
  id: string;
  hosted_zone_id: string;
  name: string;
  type: string;
  ttl: number;
  values: string[];
  routing_policy: string;
  weight: number | null;
}

interface HostedZone {
  id: string;
  name: string;
  comment: string;
  private_zone: boolean;
  vpc_id: string | null;
  vpc_region: string | null;
}

export default function HostedZoneDetailPage() {
  const { zoneId } = useParams() as { zoneId: string };
  const router = useRouter();

  // State
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  const selectedRecordId = selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  // Create/Edit modal dialog state (Define Simple Record)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [recordName, setRecordName] = useState("");
  const [recordType, setRecordType] = useState("A");
  const [recordTtl, setRecordTtl] = useState(300);
  const [recordValues, setRecordValues] = useState("");
  const [routingPolicy, setRoutingPolicy] = useState("Simple");
  const [weight, setWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // BIND Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"bind" | "json">("bind");
  const [exportContent, setExportContent] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isExportLoading, setIsExportLoading] = useState(false);

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Tabs and Details state
  const [activeTab, setActiveTab] = useState<"records" | "dnssec" | "tags">("records");
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCommentText, setEditCommentText] = useState("");
  const [isEditingZone, setIsEditingZone] = useState(false);

  // Custom modals/clipboard copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [deleteSearchTerm, setDeleteSearchTerm] = useState("");

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`${fieldName} copied to clipboard.`, "success");
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleEditZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingZone(true);
    try {
      await api.zones.update(zoneId, editCommentText);
      showToast("Hosted zone details updated.", "success");
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update hosted zone details.", "error");
    } finally {
      setIsEditingZone(false);
    }
  };

  // Delete hosted zone modal state
  const [isDeleteZoneModalOpen, setIsDeleteZoneModalOpen] = useState(false);
  const [deleteZoneConfirmText, setDeleteZoneConfirmText] = useState("");
  const [isDeletingZone, setIsDeletingZone] = useState(false);

  const handleDeleteZoneClick = () => {
    setDeleteZoneConfirmText("");
    setIsDeleteZoneModalOpen(true);
  };

  const handleConfirmDeleteZone = async () => {
    if (!zone) return;
    setIsDeletingZone(true);
    try {
      await api.zones.delete(zoneId);
      showToast(`Hosted zone ${zone.name} deleted successfully.`, "success");
      setIsDeleteZoneModalOpen(false);
      router.push("/hosted-zones");
    } catch (err: any) {
      showToast(err.message || "Failed to delete hosted zone.", "error");
    } finally {
      setIsDeletingZone(false);
    }
  };

  async function loadData() {
    setIsLoading(true);
    try {
      const zoneData = await api.zones.get(zoneId);
      setZone(zoneData);
      const recordsData = await api.records.list(zoneId);
      setRecords(recordsData);
      setSelectedRecordIds([]);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load zone records.", "error");
      router.push("/hosted-zones");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (api.auth.isAuthenticated()) {
      loadData();
    }

    const handleCloseAll = () => {
      setSelectedRecordIds([]);
      setIsFormOpen(false);
      setIsImportOpen(false);
      setIsExportOpen(false);
      setIsDeleteRecordModalOpen(false);
    };
    window.addEventListener("route53-close-all", handleCloseAll);
    return () => window.removeEventListener("route53-close-all", handleCloseAll);
  }, [zoneId]);

  const handleOpenCreate = () => {
    setFormMode("create");
    setRecordName("");
    setRecordType("A");
    setRecordTtl(300);
    setRecordValues("");
    setRoutingPolicy("Simple");
    setWeight("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedRecordId) return;
    const rec = records.find((r) => r.id === selectedRecordId);
    if (!rec) return;

    setFormMode("edit");
    
    // Relative name extraction for form field
    let relName = rec.name;
    if (zone) {
      if (relName === zone.name) {
        relName = "@";
      } else if (relName.endsWith("." + zone.name)) {
        relName = relName.substring(0, relName.length - zone.name.length - 1);
      }
    }
    
    setRecordName(relName === "@" ? "" : relName);
    setRecordType(rec.type);
    setRecordTtl(rec.ttl);
    setRecordValues(rec.values.join("\n"));
    setRoutingPolicy(rec.routing_policy);
    setWeight(rec.weight !== null ? String(rec.weight) : "");
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordValues.trim()) return;

    setIsSubmitting(true);
    const parsedValues = recordValues
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const payload = {
      name: recordName || "@",
      type: recordType,
      ttl: recordTtl,
      values: parsedValues,
      routing_policy: routingPolicy,
      weight: routingPolicy === "Weighted" ? (parseInt(weight) || 0) : undefined,
    };

    try {
      let res;
      if (formMode === "create") {
        res = await api.records.create(zoneId, payload);
        showToast("DNS record created successfully.", "success");
      } else {
        if (!selectedRecordId) return;
        res = await api.records.update(zoneId, selectedRecordId, payload);
        showToast("DNS record updated successfully.", "success");
      }
      setIsFormOpen(false);
      loadData();
      
      // If a change request ID was generated, redirect to the changes page!
      if (res && res.change_id) {
        router.push(`/hosted-zones/${zoneId}/changes/${res.change_id}`);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save record.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = () => {
    if (selectedRecordIds.length === 0) return;
    setDeleteSearchTerm("");
    setIsDeleteRecordModalOpen(true);
  };

  const handleConfirmDeleteRecords = async () => {
    setIsLoading(true);
    setIsDeleteRecordModalOpen(false);
    try {
      // Filter out default NS/SOA records matching zone name
      const systemRecords = records.filter(
        (r) => selectedRecordIds.includes(r.id) && zone && r.name === zone.name && ["NS", "SOA"].includes(r.type)
      );

      const idsToDelete = selectedRecordIds.filter(
        (id) => !systemRecords.some((sys) => sys.id === id)
      );

      if (idsToDelete.length === 0) {
        showToast("Protected name server / SOA records cannot be deleted.", "info");
        setSelectedRecordIds([]);
        loadData();
        return;
      }

      await api.records.bulkDelete(zoneId, idsToDelete);
      showToast(`Deleted ${idsToDelete.length} DNS record(s) successfully.`, "success");
      setSelectedRecordIds([]);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete records.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      await api.records.importBind(zoneId, selectedFile);
      showToast("BIND zone file imported successfully.", "success");
      setIsImportOpen(false);
      setSelectedFile(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to parse and import BIND file.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenExport = async (format: "bind" | "json") => {
    setExportFormat(format);
    setIsExportOpen(true);
    setIsExportLoading(true);
    try {
      const data = await api.records.export(zoneId, format);
      setExportContent(format === "bind" ? data.bind_content : JSON.stringify(data, null, 2));
    } catch (err: any) {
      showToast("Failed to generate export file.", "error");
      setIsExportOpen(false);
    } finally {
      setIsExportLoading(false);
    }
  };

  const handleCopyExport = () => {
    if (!exportContent) return;
    navigator.clipboard.writeText(exportContent);
    setIsCopied(true);
    showToast("Export copied to clipboard.", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadExport = () => {
    if (!exportContent) return;
    const element = document.createElement("a");
    const file = new Blob([exportContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = exportFormat === "bind" ? `${zone?.name || 'records'}.zone` : `${zone?.name || 'records'}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Filter/Sort logic
  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.values.some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter ? r.type === typeFilter : true;
    return matchesSearch && matchesType;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (zone) {
      const isSystemA = a.name === zone.name && ["SOA", "NS"].includes(a.type);
      const isSystemB = b.name === zone.name && ["SOA", "NS"].includes(b.type);
      if (isSystemA && !isSystemB) return -1;
      if (!isSystemA && isSystemB) return 1;
    }
    return a.name.localeCompare(b.name) || a.type.localeCompare(b.type);
  });

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  
  const selectedRecord = records.find((r) => r.id === selectedRecordId);
  const isSelectedRecordSystem = !!(selectedRecord && zone && selectedRecord.name === zone.name && ["NS", "SOA"].includes(selectedRecord.type));

  const filteredDeleteRecords = records.filter(
    (r) => selectedRecordIds.includes(r.id) &&
      (r.name.toLowerCase().includes(deleteSearchTerm.toLowerCase()) ||
       r.values.some((v) => v.toLowerCase().includes(deleteSearchTerm.toLowerCase())))
  );

  return (
    <div className="relative space-y-6 text-xs text-slate-800 dark:text-slate-200">
      
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark pb-4 select-none">
        <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1">
          <Link href="/hosted-zones" className="hover:text-aws-blue transition-colors">Route 53</Link>
          <span>&gt;</span>
          <Link href="/hosted-zones" className="hover:text-aws-blue transition-colors">Hosted zones</Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{zone?.name}</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-sky-100 text-sky-850 dark:bg-sky-950/40 dark:text-sky-350 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              {zone?.private_zone ? "Private" : "Public"}
            </span>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white font-mono flex items-center gap-1.5">
              <span>{zone?.name}</span>
            </h1>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-400 hover:text-aws-blue transition-colors">
              <Info size={14} className="mt-1" />
            </a>
          </div>
          
          {/* Top-Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDeleteZoneClick}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded shadow-xs transition-colors cursor-pointer select-none"
            >
              Delete zone
            </button>
            <button
              onClick={() => showToast("Simulated Test Record propagation interface.", "info")}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded shadow-xs transition-colors cursor-pointer select-none"
            >
              Test record
            </button>
            <button
              onClick={() => showToast("Simulated Query Logging configuration interface.", "info")}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded shadow-xs transition-colors cursor-pointer select-none"
            >
              Configure query logging
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Hosted Zone Details Card */}
      {zone && (
        <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md overflow-hidden shadow-xs">
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="w-full px-5 py-3 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-left cursor-pointer select-none"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>{isDetailsOpen ? "▼" : "▶"}</span>
              <span>Hosted zone details</span>
            </h3>
          </button>
          
          {isDetailsOpen && (
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs animate-in slide-in-from-top duration-150 select-text">
              <div>
                <span className="text-slate-400 dark:text-slate-400 block mb-0.5 font-semibold">Hosted Zone ID</span>
                <span className="font-mono font-bold text-slate-800 dark:text-white select-all">{zone.id}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block mb-0.5 font-semibold">Domain name</span>
                <span className="font-mono text-slate-800 dark:text-white">{zone.name}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block mb-0.5 font-semibold">Description</span>
                <span className="text-slate-800 dark:text-white truncate block">{zone.comment || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block mb-0.5 font-semibold">VPC ID</span>
                {zone.private_zone ? (
                  <span className="font-mono text-purple-600 dark:text-purple-400 block">
                    {zone.vpc_id} ({zone.vpc_region})
                  </span>
                ) : (
                  <span className="text-slate-500 block">Public Internet Routing</span>
                )}
              </div>
              
              <div className="col-span-full pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    setEditCommentText(zone.comment || "");
                    setIsEditOpen(true);
                  }}
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded shadow-xs transition-colors cursor-pointer select-none"
                >
                  Edit hosted zone
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex border-b border-border-light dark:border-border-dark select-none">
        <button
          onClick={() => setActiveTab("records")}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "records"
              ? "border-aws-orange text-aws-blue dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          Records ({records.length})
        </button>
        <button
          onClick={() => setActiveTab("dnssec")}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "dnssec"
              ? "border-aws-orange text-aws-blue dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          DNSSEC signing
        </button>
        <button
          onClick={() => setActiveTab("tags")}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "tags"
              ? "border-aws-orange text-aws-blue dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          Hosted zone tags (0)
        </button>
      </div>

      {/* Tab Contents: Records */}
      {activeTab === "records" && (
        <div className="flex flex-col lg:flex-row items-stretch gap-4">
          
          {/* Left Column: Records Table list */}
          <div className="flex-1 space-y-4 min-w-0">
            
            {/* Action Toolbar Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md shadow-xs select-none">
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={loadData}
                  className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
                  title="Refresh records"
                >
                  <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                </button>
                
                <button
                  onClick={handleDeleteRecord}
                  disabled={selectedRecordIds.length === 0}
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed select-none"
                >
                  Delete record
                </button>

                <button
                  onClick={() => setIsImportOpen(true)}
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded cursor-pointer select-none"
                >
                  Import zone file
                </button>

                {/* Exports */}
                <div className="relative group">
                  <button
                    className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>Export records</span>
                    <ChevronDown size={12} />
                  </button>
                  <div className="hidden group-hover:block absolute left-0 mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded py-1 z-35 text-[11px]">
                    <button
                      onClick={() => handleOpenExport("bind")}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                    >
                      BIND Zone Format
                    </button>
                    <button
                      onClick={() => handleOpenExport("json")}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                    >
                      JSON Array Format
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleOpenCreate}
                className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-bold px-4 py-1.5 rounded shadow-sm transition-colors cursor-pointer shrink-0 select-none"
              >
                Create record
              </button>

            </div>

            {/* Search Filters Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md shadow-xs text-xs">
              
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter records by property or value"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-3 py-1.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Type dropdown */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-slate-500 font-semibold select-none">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white w-full sm:w-28 cursor-pointer"
                >
                  <option value="">All</option>
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="NS">NS</option>
                  <option value="PTR">PTR</option>
                  <option value="SRV">SRV</option>
                  <option value="CAA">CAA</option>
                </select>
              </div>
              
              {/* Alias dropdown */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-slate-500 font-semibold select-none">Alias:</span>
                <select
                  className="py-1 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white w-full sm:w-24 cursor-pointer"
                  disabled
                >
                  <option>All</option>
                </select>
              </div>

              {/* Pagination Controls Right */}
              <div className="sm:ml-auto flex items-center gap-1 text-[11px] text-slate-500 select-none">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  &lt;
                </button>
                <span className="px-2 font-bold text-slate-800 dark:text-white">{currentPage}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  &gt;
                </button>
                <button
                  onClick={() => showToast("Configure table preference settings.", "info")}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-500 cursor-pointer ml-1"
                  title="Configure table settings"
                >
                  <Settings size={12} />
                </button>
              </div>

            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md shadow-xs overflow-x-auto select-text">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-border-light dark:border-border-dark text-slate-500 dark:text-slate-400 font-bold select-none text-[11px]">
                    <th className="py-2.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          sortedRecords.length > 0 &&
                          sortedRecords
                            .filter((r) => !(zone && r.name === zone.name && ["NS", "SOA"].includes(r.type)))
                            .every((r) => selectedRecordIds.includes(r.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const deletableIds = sortedRecords
                              .filter((r) => !(zone && r.name === zone.name && ["NS", "SOA"].includes(r.type)))
                              .map((r) => r.id);
                            setSelectedRecordIds(deletableIds);
                          } else {
                            setSelectedRecordIds([]);
                          }
                        }}
                        className="rounded text-aws-orange focus:ring-aws-orange cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-4">Record name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Routing policy</th>
                    <th className="py-2.5 px-4">Differentiator</th>
                    <th className="py-2.5 px-4">Alias</th>
                    <th className="py-2.5 px-4">Value/Route traffic to</th>
                    <th className="py-2.5 px-4">TTL (seconds)</th>
                    <th className="py-2.5 px-4">Health check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 select-none">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-5 w-5 border-2 border-aws-orange border-t-transparent rounded-full animate-spin" />
                          <span>Loading records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-medium select-none">
                        No records match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((rec) => {
                      const isSystemRecord = zone && rec.name === zone.name && ["NS", "SOA"].includes(rec.type);
                      const isChecked = selectedRecordIds.includes(rec.id);
                      return (
                        <tr 
                          key={rec.id} 
                          onClick={() => {
                            // Toggle row click selection
                            if (isSystemRecord) return;
                            setSelectedRecordIds([rec.id]);
                          }}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            isChecked ? "bg-amber-50/20 dark:bg-slate-800/40" : ""
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center select-none" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!!isSystemRecord}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedRecordIds((prev) => prev.filter((id) => id !== rec.id));
                                } else {
                                  setSelectedRecordIds((prev) => [...prev, rec.id]);
                                }
                              }}
                              className="rounded text-aws-orange focus:ring-aws-orange cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                            <span className="hover:text-aws-blue dark:hover:text-blue-400 hover:underline">
                              {rec.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                              {rec.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{rec.routing_policy || "Simple"}</td>
                          <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                            {rec.routing_policy === "Weighted" && rec.weight !== null ? rec.weight : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{rec.type === "CNAME" ? "Yes" : "No"}</td>
                          <td className="py-2.5 px-4 font-mono text-[11px] whitespace-pre-line text-slate-900 dark:text-slate-300 max-w-sm truncate select-all" title={rec.values.join("\n")}>
                            {rec.values.join(", ")}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">{rec.ttl}</td>
                          <td className="py-2.5 px-4 text-slate-500">-</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected count notification banner */}
            {selectedRecordIds.length > 0 && (
              <div className="bg-slate-100 dark:bg-slate-800 border-l-4 border-aws-orange p-2 px-3.5 rounded text-[11px] text-slate-700 dark:text-slate-300 flex flex-col gap-1.5 shadow-xs select-none">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Selected <strong>{selectedRecordIds.length}</strong> record(s):{" "}
                    <span className="font-mono text-slate-900 dark:text-white truncate max-w-lg inline-block align-middle ml-1">
                      {selectedRecordIds
                        .map((id) => {
                          const r = records.find((rec) => rec.id === id);
                          return r ? `${r.name} (${r.type})` : id;
                        })
                        .join(", ")}
                    </span>
                  </span>
                  <button onClick={() => setSelectedRecordIds([])} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
                {selectedRecordIds.some((id) => {
                  const r = records.find((rec) => rec.id === id);
                  return r && zone && r.name === zone.name && ["NS", "SOA"].includes(r.type);
                }) && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium border-t border-slate-200 dark:border-slate-700 pt-1.5 mt-1">
                    <Info size={12} className="shrink-0" />
                    <span>Protected SOA/NS nameservers are selected. Deletion of these records is disabled.</span>
                  </div>
                )}
              </div>
            )}
            
          </div>

          {/* Right Column: Record Details Slide panel (Screenshot 3) */}
          {selectedRecordId && !isFormOpen && selectedRecord && (
            <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md overflow-hidden shadow-xs flex flex-col h-fit animate-in slide-in-from-right duration-200">
              
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800 flex items-center justify-between select-none">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Record details</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => showToast("Configure record display properties.", "info")} 
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <Settings size={13} />
                  </button>
                  <button 
                    onClick={() => setSelectedRecordIds([])} 
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Content body */}
              <div className="p-4 space-y-4 text-xs select-text">
                
                {/* Edit Record Button */}
                <button
                  onClick={handleOpenEdit}
                  disabled={isSelectedRecordSystem}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold py-1.5 rounded cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none"
                >
                  Edit record
                </button>

                {/* Details list */}
                <div className="space-y-3.5 pt-2">
                  
                  <div className="space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 block font-semibold">Record name</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-800 dark:text-white font-bold break-all select-all">{selectedRecord.name}</span>
                      <button
                        onClick={() => handleCopyText(selectedRecord.name, "Record name")}
                        className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedField === "Record name" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 block font-semibold">Record type</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedRecord.type}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 block font-semibold">Value</span>
                    <div className="flex items-start gap-1.5">
                      <pre className="font-mono text-[11px] text-slate-800 dark:text-slate-300 whitespace-pre-wrap select-all flex-1 bg-slate-50 dark:bg-slate-950 p-1.5 rounded max-h-24 overflow-y-auto">
                        {selectedRecord.values.join("\n")}
                      </pre>
                      <button
                        onClick={() => handleCopyText(selectedRecord.values.join("\n"), "Record value")}
                        className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer mt-1"
                        title="Copy value list"
                      >
                        {copiedField === "Record value" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 block font-semibold">Alias</span>
                    <span className="text-slate-800 dark:text-white">{selectedRecord.type === "CNAME" ? "Yes" : "No"}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 block font-semibold">TTL (seconds)</span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold">{selectedRecord.ttl}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 block font-semibold">Routing policy</span>
                    <span className="text-slate-800 dark:text-white">{selectedRecord.routing_policy || "Simple"}</span>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* Tab Contents: DNSSEC Signing */}
      {activeTab === "dnssec" && (
        <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">DNSSEC signing</h3>
          <p className="text-slate-500 max-w-2xl leading-relaxed text-xs select-text">
            Domain Name System Security Extensions (DNSSEC) protects against DNS spoofing. When you enable DNSSEC signing, Route 53 adds digital signatures to records.
          </p>
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-md max-w-xl">
            <span className="block text-slate-500 font-semibold mb-1 select-none">Status</span>
            <div className="flex items-center gap-3 select-none">
              <span className="font-bold text-slate-500 uppercase">Disabled</span>
              <button 
                onClick={() => showToast("Simulated enabling DNSSEC signing.", "success")}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-150 border border-border-light dark:border-border-dark text-xs font-semibold px-4 py-1.5 rounded cursor-pointer transition-colors"
              >
                Enable DNSSEC signing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Hosted Zone Tags */}
      {activeTab === "tags" && (
        <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hosted zone tags</h3>
            <button
              onClick={() => showToast("Simulated tag manager.", "info")}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-150 border border-border-light dark:border-border-dark text-xs font-semibold px-3 py-1.5 rounded cursor-pointer transition-colors"
            >
              Manage tags
            </button>
          </div>
          <table className="w-full text-left border-collapse text-xs max-w-xl select-text">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-border-light dark:border-border-dark text-slate-500 dark:text-slate-400 font-bold select-none">
                <th className="py-2.5 px-4">Key</th>
                <th className="py-2.5 px-4">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-2.5 px-4 font-semibold">Environment</td>
                <td className="py-2.5 px-4">Production</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold">Project</td>
                <td className="py-2.5 px-4">AWS-Route53-Replica</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Define Simple Record Dialog (Screenshot 5 Style Popup Modal) */}
      {isFormOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border-light dark:border-border-dark p-6 z-50 animate-in zoom-in-95 duration-155 max-h-[90vh] overflow-y-auto select-text">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3.5 mb-4 select-none">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                {formMode === "create" ? "Define simple record" : "Edit simple record"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5 text-xs">
              
              {/* Record Name */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  Record name{" "}
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-aws-blue dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1 font-normal select-none">
                    Info
                  </a>
                </label>
                <p className="text-[10px] text-slate-500 leading-normal select-none">
                  To route traffic to a subdomain, enter the subdomain name. For example, to route traffic to blog.example.com, enter blog. If you leave this field blank, the default record name is the name of the domain.
                </p>
                <div className="flex items-center gap-1.5 max-w-md">
                  <input
                    type="text"
                    disabled={formMode === "edit"}
                    placeholder="subdomain"
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value)}
                    className="w-1/2 py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white font-mono"
                  />
                  <span className="font-mono text-slate-500 font-semibold select-none text-[11px] truncate w-1/2">
                    {zone?.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block select-none">
                  Keep blank to create a record for the root domain.
                </span>
              </div>

              {/* Record Type */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  Record type{" "}
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-aws-blue dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1 font-normal select-none">
                    Info
                  </a>
                </label>
                <p className="text-[10px] text-slate-500 leading-normal select-none">
                  The DNS type of the record determines the format of the value that Route 53 returns in response to DNS queries.
                </p>
                <select
                  disabled={formMode === "edit"}
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full max-w-md py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white cursor-pointer"
                >
                  <option value="A">A ─ Routes traffic to an IPv4 address and some AWS resources</option>
                  <option value="AAAA">AAAA ─ Routes traffic to an IPv6 address and some AWS resources</option>
                  <option value="CNAME">CNAME ─ Routes traffic to another domain name and some AWS resources</option>
                  <option value="MX">MX ─ Routes traffic to a mail server</option>
                  <option value="TXT">TXT ─ Adds text records (e.g. for SPF or DKIM)</option>
                  <option value="NS">NS ─ Delegates zone authority</option>
                  <option value="PTR">PTR ─ Reverse DNS pointer mapping</option>
                  <option value="SRV">SRV ─ Specifies port and host details for service</option>
                  <option value="CAA">CAA ─ Constrains certificate issuing authority</option>
                </select>
                <span className="text-[10px] text-slate-400 block select-none">
                  Choose when routing traffic to AWS resources for EC2, API Gateway, Amazon VPC, CloudFront, Elastic Beanstalk, ELB, or S3. For example: 192.0.2.44.
                </span>
              </div>

              {/* Value / Route Traffic to */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  Value/Route traffic to{" "}
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-aws-blue dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1 font-normal select-none">
                    Info
                  </a>
                </label>
                <p className="text-[10px] text-slate-500 leading-normal select-none">
                  The option that you choose determines how Route 53 responds to DNS queries. For most options, you specify where you want to route internet traffic.
                </p>
                <select
                  className="w-full max-w-md py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white cursor-pointer select-none"
                  defaultValue="ip"
                >
                  <option value="ip">IP address or another value, depending on record type</option>
                </select>
                <textarea
                  required
                  rows={4}
                  placeholder={
                    recordType === "A"
                      ? "192.0.2.235"
                      : recordType === "CNAME"
                      ? "webserver.example.com"
                      : "Enter values list..."
                  }
                  value={recordValues}
                  onChange={(e) => setRecordValues(e.target.value)}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white resize-none font-mono text-[11px]"
                />
                <span className="text-[10px] text-slate-400 block select-none">
                  Enter multiple values on separate lines.
                </span>
              </div>

              {/* TTL and Routing Policy Option configs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">TTL (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={recordTtl}
                    onChange={(e) => setRecordTtl(parseInt(e.target.value) || 0)}
                    className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Routing policy</label>
                  <select
                    value={routingPolicy}
                    onChange={(e) => setRoutingPolicy(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white cursor-pointer font-sans"
                  >
                    <option value="Simple">Simple routing</option>
                    <option value="Weighted">Weighted routing</option>
                  </select>
                </div>
              </div>

              {routingPolicy === "Weighted" && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-border-light dark:border-border-dark rounded-md animate-in fade-in duration-200 max-w-xs">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Weight <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    required={routingPolicy === "Weighted"}
                    placeholder="e.g. 100"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white font-mono"
                  />
                </div>
              )}

              {/* Actions Footer */}
              <div className="border-t border-border-light dark:border-border-dark pt-4 flex gap-3 justify-end select-none">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !recordValues.trim()}
                  className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-bold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>{formMode === "create" ? "Define simple record" : "Save changes"}</span>
                </button>
              </div>

            </form>
          </div>
        </>
      )}

      {/* Delete Selected Record Modal (Screenshot 4 Style Centered Overlay) */}
      {isDeleteRecordModalOpen && selectedRecordIds.length > 0 && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border-light dark:border-border-dark p-6 z-50 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col justify-between select-text">
            
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3 select-none">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                  Delete selected record?
                </h3>
                <button onClick={() => setIsDeleteRecordModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Warning Content */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                Delete the record permanently? This action cannot be undone. Your domain might become unavailable on the internet.
              </p>

              {/* Search filter inside Delete Modal */}
              <div className="relative select-none">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search selected records..."
                  value={deleteSearchTerm}
                  onChange={(e) => setDeleteSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange dark:text-white text-xs"
                />
              </div>

              {/* Preview Table */}
              <div className="border border-border-light dark:border-border-dark rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-500 dark:text-slate-400 select-none">
                      <th className="py-2 px-3">Record name</th>
                      <th className="py-2 px-3 w-16">Type</th>
                      <th className="py-2 px-3">Value/Route traffic to</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDeleteRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-semibold break-all text-slate-800 dark:text-white">{r.name}</td>
                        <td className="py-2 px-3 font-bold text-slate-600 dark:text-slate-400">{r.type}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-xs" title={r.values.join("\n")}>
                          {r.values.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions footer */}
            <div className="border-t border-border-light dark:border-border-dark pt-3 mt-4 flex justify-end gap-3 select-none">
              <button
                onClick={() => setIsDeleteRecordModalOpen(false)}
                className="text-aws-blue hover:text-aws-blue-hover dark:text-blue-400 hover:underline font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteRecords}
                className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Delete</span>
              </button>
            </div>

          </div>
        </>
      )}

      {/* BIND Import Modal */}
      {isImportOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border-light dark:border-border-dark p-6 z-50 animate-in zoom-in-95 duration-150 select-text">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3 mb-4 select-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Upload size={14} className="text-aws-orange" />
                <span>Import BIND Zone File</span>
              </h3>
              <button 
                onClick={() => {
                  setIsImportOpen(false);
                  setSelectedFile(null);
                }} 
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <div className="bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 p-3 rounded leading-relaxed text-blue-800 dark:text-blue-300 select-none">
                Choose a standard zone file (complying with RFC 1035). The parser will automatically process records ($ORIGIN, $TTL, A, AAAA, MX, CNAME, TXT, etc.).
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-aws-orange dark:hover:border-aws-orange rounded-lg p-8 text-center cursor-pointer transition-colors select-none"
              >
                <FileText size={24} className="mx-auto text-slate-400 mb-2" />
                <span className="block font-semibold text-slate-700 dark:text-slate-300">
                  {selectedFile ? selectedFile.name : "Click to select a zone file"}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Supports .zone, .txt, or BIND files"}
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".zone,.txt,.db,*"
                />
              </div>

              <div className="pt-3 border-t border-border-light dark:border-border-dark flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setSelectedFile(null);
                  }}
                  className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !selectedFile}
                  className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>Import records</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Export Display Modal */}
      {isExportOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border-light dark:border-border-dark p-6 z-50 animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh] select-text">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3 mb-4 select-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Download size={14} className="text-aws-orange" />
                <span>Export zone records ({exportFormat.toUpperCase()})</span>
              </h3>
              <button 
                onClick={() => {
                  setIsExportOpen(false);
                  setExportContent("");
                }} 
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-border-light dark:border-border-dark rounded-md p-4 mb-4">
              {isExportLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 select-none">
                  <div className="h-6 w-6 border-2 border-aws-orange border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">Generating export file...</span>
                </div>
              ) : (
                <pre className="font-mono text-[11px] text-slate-800 dark:text-slate-300 whitespace-pre-wrap select-text">
                  {exportContent}
                </pre>
              )}
            </div>

            <div className="border-t border-border-light dark:border-border-dark pt-3 flex justify-between items-center text-xs select-none">
              <span className="text-[10px] text-slate-400 dark:text-slate-400">
                {exportFormat === "bind" 
                  ? "Standard BIND directive list ready to save." 
                  : "JSON list of mapped DNS records."
                }
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyExport}
                  disabled={isExportLoading || !exportContent}
                  className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleDownloadExport}
                  disabled={isExportLoading || !exportContent}
                  className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-semibold px-3 py-1.5 rounded shadow transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Download size={12} />
                  <span>Download file</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Hosted Zone details / Comment modal */}
      {isEditOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border-light dark:border-border-dark p-6 z-50 animate-in zoom-in-95 duration-150 select-text">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3 mb-4 select-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Edit size={14} className="text-aws-orange" />
                <span>Edit Hosted Zone Details</span>
              </h3>
              <button 
                onClick={() => setIsEditOpen(false)} 
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditZoneSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Description (comment)</label>
                <textarea
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value.slice(0, 256))}
                  placeholder="Enter hosted zone description..."
                  rows={4}
                  maxLength={256}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white"
                />
                <span className="text-[10px] text-slate-400 block mt-1 select-none">
                  Up to 256 characters. <strong className="font-mono">{editCommentText.length}/256</strong>
                </span>
              </div>

              <div className="pt-3 border-t border-border-light dark:border-border-dark flex justify-end gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingZone}
                  className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isEditingZone ? (
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>Save changes</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
      {/* Delete Hosted Zone Modal */}
      {isDeleteZoneModalOpen && zone && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-50 animate-in zoom-in-95 duration-150 select-text">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/30 rounded-full text-red-600 dark:text-red-400 shrink-0 select-none">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-3 w-full text-xs">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white select-none">
                  Delete hosted zone
                </h3>
                
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3 rounded text-[11px] text-red-800 dark:text-red-300 leading-relaxed">
                  <strong className="select-none">Warning:</strong> Deleting hosted zones is permanent and cannot be undone. All records stored inside this zone will be deleted.
                  <div className="mt-2 font-mono font-bold">
                    {zone.name} ({zone.id})
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-600 dark:text-slate-400 select-none">
                    To confirm deletion, type <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-mono font-bold text-red-600 dark:text-red-400">delete</code> below:
                  </label>
                  <input
                    type="text"
                    placeholder="delete"
                    value={deleteZoneConfirmText}
                    onChange={(e) => setDeleteZoneConfirmText(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors dark:text-white font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 select-none">
                  <button
                    onClick={() => {
                      setIsDeleteZoneModalOpen(false);
                      setDeleteZoneConfirmText("");
                    }}
                    className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteZone}
                    disabled={isDeletingZone || deleteZoneConfirmText.toLowerCase() !== "delete"}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingZone ? (
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
