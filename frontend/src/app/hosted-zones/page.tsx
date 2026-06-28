"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  X, 
  AlertTriangle, 
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  Edit,
  Info
} from "lucide-react";
import { showToast } from "@/components/ConsoleShell";

interface HostedZone {
  id: string;
  name: string;
  comment: string;
  private_zone: boolean;
  vpc_id: string | null;
  vpc_region: string | null;
  created_at: string;
  record_count: number;
}

export default function HostedZonesPage() {
  const router = useRouter();

  // State
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  
  // Edit description modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCommentText, setEditCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortBy, setSortBy] = useState<"name" | "type" | "record_count">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  async function fetchZones() {
    setIsLoading(true);
    try {
      const data = await api.zones.list();
      setZones(data);
      // Filter out selected IDs that no longer exist
      setSelectedZoneIds((prev) => prev.filter((id) => data.some((z: HostedZone) => z.id === id)));
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load hosted zones.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (api.auth.isAuthenticated()) {
      fetchZones();
    }

    const handleCloseAll = () => {
      setSelectedZoneIds([]);
      setIsEditOpen(false);
      setIsDeleteOpen(false);
    };
    window.addEventListener("route53-close-all", handleCloseAll);
    return () => window.removeEventListener("route53-close-all", handleCloseAll);
  }, []);

  const handleEditZoneClick = () => {
    if (selectedZoneIds.length !== 1) return;
    const zone = zones.find((z) => z.id === selectedZoneIds[0]);
    if (!zone) return;
    setEditCommentText(zone.comment || "");
    setIsEditOpen(true);
  };

  const handleEditZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedZoneIds.length !== 1) return;
    setIsEditing(true);
    try {
      await api.zones.update(selectedZoneIds[0], editCommentText);
      showToast("Hosted zone description updated successfully.", "success");
      setIsEditOpen(false);
      fetchZones();
    } catch (err: any) {
      showToast(err.message || "Failed to update hosted zone description.", "error");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteZone = async () => {
    setIsDeleting(true);
    try {
      for (const zoneId of selectedZoneIds) {
        await api.zones.delete(zoneId);
      }
      showToast("Hosted zone(s) deleted successfully.", "success");
      setIsDeleteOpen(false);
      setConfirmDeleteText("");
      setSelectedZoneIds([]);
      fetchZones();
    } catch (err: any) {
      showToast(err.message || "Failed to delete hosted zones.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter/Sort logic
  const filteredZones = zones.filter((zone) =>
    zone.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedZones = [...filteredZones].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "type") {
      const typeA = a.private_zone ? "Private" : "Public";
      const typeB = b.private_zone ? "Private" : "Public";
      comparison = typeA.localeCompare(typeB);
    } else if (sortBy === "record_count") {
      comparison = a.record_count - b.record_count;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedZones.length / itemsPerPage) || 1;
  const paginatedZones = sortedZones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: "name" | "type" | "record_count") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const selectedZones = zones.filter((z) => selectedZoneIds.includes(z.id));

  return (
    <div className="relative space-y-6 text-xs text-slate-800 dark:text-slate-200">
      
      {/* Breadcrumbs Header */}
      <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark pb-4 select-none">
        <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1">
          <Link href="/" className="hover:text-aws-blue transition-colors">Route 53</Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Hosted zones</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Hosted zones ({zones.length})
        </h1>
      </div>

      {/* Action Controls Bar (Screenshot 2 style layout) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md shadow-xs select-none">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchZones}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
            title="Refresh hosted zones"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
          
          <button
            onClick={() => {
              if (selectedZoneIds.length === 1) {
                router.push(`/hosted-zones/${selectedZoneIds[0]}`);
              }
            }}
            disabled={selectedZoneIds.length !== 1}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            View details
          </button>

          <button
            onClick={handleEditZoneClick}
            disabled={selectedZoneIds.length !== 1}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Edit
          </button>

          <button
            onClick={() => {
              if (selectedZoneIds.length > 0) {
                setConfirmDeleteText("");
                setIsDeleteOpen(true);
              }
            }}
            disabled={selectedZoneIds.length === 0}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>

        {/* Right Create Button */}
        <Link
          href="/hosted-zones/create"
          className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-bold px-4 py-1.5 rounded shadow-sm transition-colors cursor-pointer select-none"
        >
          Create hosted zone
        </Link>
      </div>

      {/* Search and Filters & Pagination Row (Screenshot 2 Style) */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md shadow-xs text-xs">
        
        {/* Search Input bar */}
        <div className="relative w-full sm:w-96">
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

        {/* Pagination controls on the right */}
        <div className="sm:ml-auto flex items-center gap-1.5 text-[11px] text-slate-500 select-none">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            &lt;
          </button>
          <span className="font-bold text-slate-800 dark:text-white px-1">
            {currentPage}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            &gt;
          </button>
          <button
            onClick={() => showToast("Table preferences configuration.", "info")}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-500 cursor-pointer"
            title="Table settings"
          >
            <Settings size={12} />
          </button>
        </div>

      </div>

      {/* Hosted Zones Table */}
      <div className="bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark rounded-md shadow-xs overflow-x-auto select-text">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-500 dark:text-slate-400 select-none">
              <th className="py-2.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedZones.length > 0 &&
                    paginatedZones.every((z) => selectedZoneIds.includes(z.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const pageIds = paginatedZones.map((z) => z.id);
                      setSelectedZoneIds(pageIds);
                    } else {
                      setSelectedZoneIds([]);
                    }
                  }}
                  className="appearance-none rounded-full border border-slate-300 dark:border-slate-600 checked:bg-sky-500 checked:border-sky-500 focus:outline-none w-3.5 h-3.5 cursor-pointer relative checked:after:content-[''] checked:after:absolute checked:after:w-1.5 checked:after:h-1.5 checked:after:bg-white checked:after:rounded-full checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                />
              </th>
              <th className="py-2.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => toggleSort("name")}>
                Hosted zone name {sortBy === "name" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th className="py-2.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => toggleSort("type")}>
                Type {sortBy === "type" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th className="py-2.5 px-4">Created by</th>
              <th className="py-2.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => toggleSort("record_count")}>
                Record count {sortBy === "record_count" && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
              <th className="py-2.5 px-4">Description</th>
              <th className="py-2.5 px-4 font-mono">Hosted zone ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2 select-none">
                    <div className="h-5 w-5 border-2 border-aws-orange border-t-transparent rounded-full animate-spin" />
                    <span>Loading hosted zones...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedZones.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-medium select-none">
                  No hosted zones found. {searchTerm ? "Try adjusting your filter." : "Create a hosted zone to get started!"}
                </td>
              </tr>
            ) : (
              paginatedZones.map((zone) => {
                const isSelected = selectedZoneIds.includes(zone.id);
                return (
                  <tr 
                    key={zone.id} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? "bg-amber-50/20 dark:bg-slate-800/40" : ""
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedZoneIds((prev) => prev.filter((id) => id !== zone.id));
                          } else {
                            setSelectedZoneIds((prev) => [...prev, zone.id]);
                          }
                        }}
                        className="appearance-none rounded-full border border-slate-300 dark:border-slate-600 checked:bg-sky-500 checked:border-sky-500 focus:outline-none w-3.5 h-3.5 cursor-pointer relative checked:after:content-[''] checked:after:absolute checked:after:w-1.5 checked:after:h-1.5 checked:after:bg-white checked:after:rounded-full checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-aws-blue hover:text-aws-blue-hover dark:text-blue-400 hover:underline">
                      <Link href={`/hosted-zones/${zone.id}`}>{zone.name}</Link>
                    </td>
                    <td className="py-2.5 px-4">
                      {zone.private_zone ? "Private" : "Public"}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">Route 53</td>
                    <td className="py-2.5 px-4 font-medium">{zone.record_count}</td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={zone.comment}>
                      {zone.comment || "—"}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 select-all">{zone.id}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-border-light dark:border-border-dark px-4 py-2.5 flex items-center justify-between text-slate-500 dark:text-slate-400 select-none text-[11px]">
        <span>
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedZones.length)} of {sortedZones.length} zones
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-border-light dark:border-border-dark hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-semibold text-slate-800 dark:text-white">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-border-light dark:border-border-dark hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Edit Hosted Zone Description Modal */}
      {isEditOpen && selectedZones.length === 1 && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border-light dark:border-border-dark p-6 z-50 animate-in zoom-in-95 duration-150 select-text">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3 mb-4 select-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Edit size={14} className="text-aws-orange" />
                <span>Edit Hosted Zone details</span>
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
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange transition-colors dark:text-white"
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
                  disabled={isEditing}
                  className="bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isEditing ? (
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>Save changes</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {isDeleteOpen && selectedZones.length > 0 && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border-light dark:border-border-dark p-6 z-50 animate-in zoom-in-95 duration-150 select-text">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/30 rounded-full text-red-600 dark:text-red-400 shrink-0 select-none">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-3 w-full text-xs">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white select-none">
                  Delete {selectedZones.length} Hosted Zone(s)
                </h3>
                
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3 rounded text-[11px] text-red-800 dark:text-red-300 leading-relaxed max-h-36 overflow-y-auto">
                  <strong className="select-none">Warning:</strong> Deleting hosted zones is permanent and cannot be undone. All records stored inside these zones will be deleted.
                  <ul className="mt-2 list-disc pl-4 font-mono">
                    {selectedZones.map((z) => (
                      <li key={z.id}>{z.name} ({z.id})</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-600 dark:text-slate-400 select-none">
                    To confirm deletion, type <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-mono font-bold text-red-600 dark:text-red-400">delete</code> below:
                  </label>
                  <input
                    type="text"
                    placeholder="delete"
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors dark:text-white font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-border-light dark:border-border-dark flex justify-end gap-2 select-none">
                  <button
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setConfirmDeleteText("");
                    }}
                    className="border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteZone}
                    disabled={isDeleting || confirmDeleteText.toLowerCase() !== "delete"}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    <span>Delete Hosted Zone(s)</span>
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
