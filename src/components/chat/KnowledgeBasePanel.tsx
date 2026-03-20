import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Globe,
  RefreshCw,
  Link,
} from "lucide-react";

type KnowledgeDoc = {
  id: string;
  filename: string;
  file_size: number;
  status: string;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
  source_url?: string | null;
};

const ACCEPTED_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface KnowledgeBasePanelProps {
  enabled: boolean;
}

const KnowledgeBasePanel = ({ enabled }: KnowledgeBasePanelProps) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !enabled) return;
    loadDocuments();
  }, [user, enabled]);

  const getToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token;
  };

  const callEdgeFunction = async (body: Record<string, unknown>) => {
    const token = await getToken();
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Request failed");
    }
    return resp.json();
  };

  const loadDocuments = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("knowledge_documents")
      .select("id, filename, file_size, status, chunk_count, error_message, created_at, source_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocuments((data as KnowledgeDoc[]) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    const file = e.target.files[0];

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 10MB");
      return;
    }

    const isAccepted =
      ACCEPTED_TYPES.includes(file.type) ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".pdf");

    if (!isAccepted) {
      toast.error("Supported formats: .txt, .md, .csv, .html, .json, .pdf");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("knowledge_documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: doc, error: insertError } = await supabase
        .from("knowledge_documents")
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || "text/plain",
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success(`"${file.name}" uploaded — processing...`);
      setDocuments((prev) => [doc as KnowledgeDoc, ...prev]);

      const result = await callEdgeFunction({ action: "process", document_id: doc.id });
      toast.success(`"${file.name}" indexed — ${result.chunk_count} chunks created`);
      loadDocuments();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
      loadDocuments();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddUrl = async () => {
    if (!user || !urlInput.trim()) return;

    let url = urlInput.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    setAddingUrl(true);
    try {
      const result = await callEdgeFunction({ action: "ingest_url", url });
      toast.success(`URL indexed — ${result.chunk_count} chunks created`);
      setUrlInput("");
      setShowUrlInput(false);
      loadDocuments();
    } catch (err: any) {
      console.error("URL ingest error:", err);
      toast.error(err.message || "Failed to ingest URL");
      loadDocuments();
    } finally {
      setAddingUrl(false);
    }
  };

  const handleDelete = async (doc: KnowledgeDoc) => {
    if (!confirm(`Delete "${doc.filename}"? This will remove all indexed chunks.`)) return;

    try {
      await callEdgeFunction({ action: "delete", document_id: doc.id });
      toast.success(`"${doc.filename}" deleted`);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRefresh = async (doc: KnowledgeDoc) => {
    if (!doc.source_url) return;
    toast.info(`Re-indexing "${doc.filename}"...`);

    try {
      // Delete old doc then re-ingest
      await callEdgeFunction({ action: "delete", document_id: doc.id });
      const result = await callEdgeFunction({ action: "ingest_url", url: doc.source_url });
      toast.success(`Re-indexed — ${result.chunk_count} chunks`);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Refresh failed");
      loadDocuments();
    }
  };

  if (!enabled) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "processing":
        return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />;
    }
  };

  return (
    <div className="border-t border-border bg-card/50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Knowledge Base</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {documents.filter((d) => d.status === "ready").length} docs
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowUrlInput(!showUrlInput)}
            >
              <Link className="h-3 w-3" />
              URL
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Upload
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.html,.json,.pdf,text/plain,text/markdown,text/csv,text/html,application/json,application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {showUrlInput && (
          <div className="flex gap-2 mb-3">
            <Input
              type="url"
              placeholder="https://example.com/page"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            />
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1 shrink-0"
              onClick={handleAddUrl}
              disabled={addingUrl || !urlInput.trim()}
            >
              {addingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
              Add
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-4">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Upload files (.txt, .md, .csv, .json, .pdf) or add URLs to build your knowledge base.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-40">
            <div className="space-y-1.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-xs"
                >
                  {doc.source_url ? (
                    <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    statusIcon(doc.status)
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.filename}</p>
                    <p className="text-muted-foreground">
                      {formatSize(doc.file_size)}
                      {doc.status === "ready" && ` · ${doc.chunk_count} chunks`}
                      {doc.status === "error" && (
                        <span className="text-destructive"> · {doc.error_message}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {doc.source_url && doc.status === "ready" && (
                      <button
                        onClick={() => handleRefresh(doc)}
                        className="text-muted-foreground hover:text-primary min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Re-scrape and re-index"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(doc)}
                      className="text-muted-foreground hover:text-destructive min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBasePanel;
