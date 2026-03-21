import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search, Trash2, RefreshCw, Plus, AlertTriangle, CheckCircle2,
  Clock, FileText, Link as LinkIcon, Loader2, Upload,
} from "lucide-react";

type KBDoc = {
  id: string;
  filename: string;
  source_url: string | null;
  status: string;
  chunk_count: number;
  file_size: number;
  user_id: string;
  category?: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
};

interface KnowledgeBaseTabProps {
  documents: KBDoc[];
  kbStats: { totalDocs: number; totalChunks: number; pendingDocs: number; errorDocs: number };
  profileMap: Record<string, string>;
  onAction: (action: string, payload?: any) => Promise<void>;
  onRefresh: () => void;
}

const ACCEPTED_TYPES = ".txt,.md,.csv,.html,.json,.pdf";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const statusIcon = (status: string) => {
  switch (status) {
    case "ready": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "processing": return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    case "error": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "ready": return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "processing": return "bg-primary/10 text-primary";
    case "error": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

const KnowledgeBaseTab = ({ documents, kbStats, profileMap, onAction, onRefresh }: KnowledgeBaseTabProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newUrl, setNewUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = Array.from(new Set(documents.map((d) => d.category || "general"))).sort();

  const filtered = documents.filter((d) => {
    const matchesSearch = !search ||
      d.filename.toLowerCase().includes(search.toLowerCase()) ||
      (d.source_url || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || (d.category || "general") === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleAddUrl = async () => {
    if (!newUrl.trim()) return;
    setAddingUrl(true);
    try {
      await onAction("add_kb_url", { url: newUrl.trim() });
      setNewUrl("");
      toast.success("URL queued for ingestion");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddingUrl(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large (max 10MB)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      await onAction("upload_kb_file", {
        file_base64: base64,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
      });
      toast.success(`"${file.name}" uploaded and queued for processing`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await onAction("trigger_kb_refresh");
      toast.success("Knowledge base refresh triggered");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBulkCleanup = async () => {
    setCleaning(true);
    try {
      await onAction("bulk_cleanup_kb");
      toast.success("Stuck documents cleaned up");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCleaning(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await onAction("delete_kb_doc", { doc_id: docId });
      toast.success("Document deleted");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Documents", value: kbStats.totalDocs, icon: FileText },
          { label: "Chunks", value: kbStats.totalChunks, icon: FileText },
          { label: "Processing", value: kbStats.pendingDocs, icon: Clock },
          { label: "Errors", value: kbStats.errorDocs, icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Add URL to ingest..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            className="min-h-[44px]"
          />
          <Button onClick={handleAddUrl} disabled={addingUrl || !newUrl.trim()} className="min-h-[44px] shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="min-h-[44px]"
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {uploading ? "Uploading…" : "Upload File"}
          </Button>
          <Button variant="outline" onClick={handleRefreshAll} disabled={refreshing} className="min-h-[44px]">
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh All
          </Button>
          <Button variant="outline" onClick={handleBulkCleanup} disabled={cleaning} className="min-h-[44px]">
            <AlertTriangle className="h-4 w-4 mr-1" /> Cleanup
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 min-h-[44px]" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", "ready", "processing", "error", "pending"].map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="min-h-[36px] text-xs capitalize">
                {s}
              </Button>
            ))}
          </div>
        </div>
        {categories.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground self-center mr-1">Category:</span>
            <Button variant={categoryFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter("all")} className="min-h-[32px] text-xs h-7">All</Button>
            {categories.map((c) => (
              <Button key={c} variant={categoryFilter === c ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter(c)} className="min-h-[32px] text-xs h-7 capitalize">
                {c}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Document list */}
      <ScrollArea className="h-[calc(100vh-28rem)]">
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {statusIcon(doc.status)}
                  <p className="font-medium text-sm truncate">{doc.filename}</p>
                  <Badge className={`text-[10px] h-5 ${statusColor(doc.status)}`}>{doc.status}</Badge>
                  {doc.category && doc.category !== "general" && (
                    <Badge variant="outline" className="text-[10px] h-5">{doc.category}</Badge>
                  )}
                </div>
                {doc.source_url && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <LinkIcon className="h-3 w-3 shrink-0" /> {doc.source_url}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {doc.chunk_count} chunks · {profileMap[doc.user_id] || doc.user_id.slice(0, 8)} · {new Date(doc.updated_at).toLocaleDateString()}
                </p>
                {doc.error_message && (
                  <p className="text-xs text-destructive mt-1 truncate">{doc.error_message}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px] text-destructive hover:text-destructive" onClick={() => handleDelete(doc.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No documents found</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default KnowledgeBaseTab;
