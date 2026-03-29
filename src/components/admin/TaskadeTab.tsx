import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckSquare, FolderOpen, Bot, Activity, Wifi, WifiOff,
  Plus, Trash2, Check, Send, RefreshCw, ChevronRight, ExternalLink,
  AlertTriangle, Copy, RotateCcw, Users, Link, FileText, Blocks,
  Calendar, StickyNote, ArrowUpDown, UserMinus, Globe, Brain,
  Image, LayoutTemplate, Sparkles, Eye, Undo2, ChevronDown, ChevronUp,
  MessageSquare,
} from "lucide-react";
import * as taskadeService from "@/integrations/taskade/taskadeService";
import {
  useTaskadeWorkspaces,
  useTaskadeProjects,
  useTaskadeTasks,
  useTaskadeAgents,
  useTaskadeFolders,
  useTaskadeAgent,
  useTaskadeSyncLogs,
  useProjectDetails,
  useTaskDetails,
  useAgentDetails,
  useFolderDetails,
  useMedia,
} from "@/hooks/useTaskade";

const TaskadeTab = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  const { workspaces, loading: wsLoading, error: wsError, notConfigured, refresh: refreshWs } = useTaskadeWorkspaces();
  const { projects, loading: projLoading, error: projError, refresh: refreshProjects, create: createProject, remove: removeProject, complete: completeProject, restore: restoreProject, copy: copyProject } = useTaskadeProjects();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { folders, loading: foldersLoading, refresh: refreshFolders } = useTaskadeFolders(selectedWorkspace);
  const { tasks, loading: tasksLoading, refresh: refreshTasks, create: createTask, update: updateTaskContent, complete: completeTask, uncomplete: uncompleteTask, remove: removeTask, move: moveTask } = useTaskadeTasks(selectedProject);
  const { agents, loading: agentsLoading, refresh: refreshAgents, createAgent, generateAgent, removeAgent, renameAgent } = useTaskadeAgents(selectedFolder);
  const { response: agentResponse, loading: agentPrompting, prompt: promptAgent } = useTaskadeAgent();
  const { logs, loading: logsLoading, refresh: refreshLogs } = useTaskadeSyncLogs();

  // Project details
  const { members, fields, blocks, shareLink, loading: detailsLoading, refresh: refreshDetails, enableShareLink } = useProjectDetails(selectedProject);

  // Task details
  const { assignees: taskAssignees, date: taskDate, note: taskNote, loading: taskDetailLoading, refresh: refreshTaskDetails, updateAssignees, removeAssignee, updateDate, removeDate, updateNote, removeNote } = useTaskDetails(selectedProject, selectedTaskId);

  // Agent details
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { agent: agentDetail, publicAgent, conversations: agentConversations, loading: agentDetailLoading, refresh: refreshAgentDetails, enablePublicAccess, addKnowledgeProject, addKnowledgeMedia, removeKnowledgeProject, removeKnowledgeMedia, getConversation } = useAgentDetails(selectedAgentId);

  // Folder details (media, templates)
  const { medias, templates, loading: folderDetailLoading, refresh: refreshFolderDetails, createFromTemplate } = useFolderDetails(selectedFolder);

  // Media hook
  const { loading: mediaLoading, get: getMediaDetails, remove: deleteMediaItem } = useMedia();

  // Form state
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [copyFolderId, setCopyFolderId] = useState("");
  const [copyTitle, setCopyTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskNoteValue, setTaskNoteValue] = useState("");
  const [knowledgeProjectId, setKnowledgeProjectId] = useState("");
  const [knowledgeMediaId, setKnowledgeMediaId] = useState("");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await taskadeService.testConnection();
      setConnected(true);
      toast.success("Taskade connected successfully");
      refreshWs();
      refreshProjects();
      refreshLogs();
    } catch (e: any) {
      setConnected(false);
      toast.error(e.message || "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    refreshWs();
  }, []);

  // Show setup prompt if not configured
  if (notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">Taskade Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            To use the Taskade integration, you need to add your Taskade API key.
            Get your API key from{" "}
            <a href="https://www.taskade.com/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
              Taskade Settings &rarr; API <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Once configured, add the <code className="bg-muted px-1 rounded">TASKADE_API_KEY</code> secret via your project settings, then refresh this page.
          </p>
        </div>
        <Button variant="outline" onClick={() => refreshWs()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          {connected === true ? <Wifi className="h-5 w-5 text-green-500" /> : connected === false ? <WifiOff className="h-5 w-5 text-destructive" /> : <Wifi className="h-5 w-5 text-muted-foreground" />}
          <div>
            <p className="text-sm font-semibold">Taskade API</p>
            <p className="text-xs text-muted-foreground">
              {connected === true ? "Connected" : connected === false ? "Connection failed" : "Not tested"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing} className="min-h-[44px]">
          {testing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
          Test Connection
        </Button>
      </div>

      <Tabs defaultValue="workspaces">
        <TabsList className="w-full flex overflow-x-auto gap-1 mb-4">
          <TabsTrigger value="workspaces" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <FolderOpen className="h-3.5 w-3.5" /> Workspaces
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <CheckSquare className="h-3.5 w-3.5" /> Projects
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <FileText className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <Bot className="h-3.5 w-3.5" /> Agents
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <Image className="h-3.5 w-3.5" /> Media
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <LayoutTemplate className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <Activity className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════ */}
        {/* Workspaces Tab */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="workspaces" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Workspaces</h3>
            <Button variant="ghost" size="sm" onClick={refreshWs} disabled={wsLoading} className="min-h-[44px]">
              <RefreshCw className={`h-4 w-4 ${wsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {wsError && <p className="text-sm text-destructive">{wsError}</p>}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className={`rounded-lg border border-border p-4 cursor-pointer transition-colors hover:border-primary/30 ${selectedWorkspace === ws.id ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => { setSelectedWorkspace(ws.id); setSelectedFolder(null); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ws.name || ws.id}</p>
                      {ws.description && <p className="text-xs text-muted-foreground mt-1">{ws.description}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              {workspaces.length === 0 && !wsLoading && (
                <p className="text-center text-sm text-muted-foreground py-8">No workspaces found. Test connection first.</p>
              )}
            </div>
          </ScrollArea>

          {/* Folders for selected workspace */}
          {selectedWorkspace && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold mb-2">Folders in workspace</h4>
              {foldersLoading ? (
                <div className="flex justify-center py-4"><RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-1">
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      className={`rounded-md border border-border p-3 cursor-pointer hover:border-primary/30 text-sm ${selectedFolder === f.id ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => setSelectedFolder(f.id)}
                    >
                      <FolderOpen className="h-3.5 w-3.5 inline mr-2 text-muted-foreground" />
                      {f.name || f.id}
                    </div>
                  ))}
                  {folders.length === 0 && <p className="text-xs text-muted-foreground">No folders found</p>}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════ */}
        {/* Projects Tab */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Projects</h3>
            <Button variant="ghost" size="sm" onClick={refreshProjects} disabled={projLoading} className="min-h-[44px]">
              <RefreshCw className={`h-4 w-4 ${projLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Create project form */}
          <div className="flex gap-2">
            <Input
              placeholder="New project title..."
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              className="min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newProjectTitle.trim() && selectedWorkspace) {
                  createProject(selectedWorkspace, newProjectTitle.trim())
                    .then(() => { setNewProjectTitle(""); toast.success("Project created"); })
                    .catch((err: any) => toast.error(err.message));
                }
              }}
            />
            <Button
              size="sm"
              className="min-h-[44px]"
              disabled={!newProjectTitle.trim() || !selectedWorkspace}
              onClick={() => {
                if (selectedWorkspace) {
                  createProject(selectedWorkspace, newProjectTitle.trim())
                    .then(() => { setNewProjectTitle(""); toast.success("Project created"); })
                    .catch((err: any) => toast.error(err.message));
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {!selectedWorkspace && <p className="text-xs text-muted-foreground">Select a workspace first to create projects</p>}

          {projError && <p className="text-sm text-destructive">{projError}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Projects list */}
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-lg border border-border p-3 cursor-pointer transition-colors hover:border-primary/30 ${selectedProject === p.id ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => { setSelectedProject(p.id); setSelectedTaskId(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.title || p.name || p.id}</p>
                        {p.task_count !== undefined && (
                          <p className="text-xs text-muted-foreground">{p.task_count} tasks</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Complete" onClick={(e) => { e.stopPropagation(); completeProject(p.id).then(() => toast.success("Project completed")).catch((err: any) => toast.error(err.message)); }}>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Restore" onClick={(e) => { e.stopPropagation(); restoreProject(p.id).then(() => toast.success("Project restored")).catch((err: any) => toast.error(err.message)); }}>
                          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete" onClick={(e) => { e.stopPropagation(); removeProject(p.id).then(() => toast.success("Deleted")).catch((err: any) => toast.error(err.message)); }}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && !projLoading && (
                  <p className="text-center text-sm text-muted-foreground py-8">No projects</p>
                )}
              </div>
            </ScrollArea>

            {/* Project details panel */}
            <div>
              {selectedProject ? (
                <div className="space-y-4">
                  {/* Copy project */}
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" /> Copy Project</h4>
                    <div className="flex gap-2">
                      <Input placeholder="Target folder ID" value={copyFolderId} onChange={(e) => setCopyFolderId(e.target.value)} className="min-h-[36px] text-xs" />
                      <Input placeholder="New title (optional)" value={copyTitle} onChange={(e) => setCopyTitle(e.target.value)} className="min-h-[36px] text-xs" />
                      <Button size="sm" className="min-h-[36px] text-xs" disabled={!copyFolderId.trim()} onClick={() => {
                        copyProject(selectedProject, copyFolderId.trim(), copyTitle.trim() || undefined)
                          .then(() => { setCopyFolderId(""); setCopyTitle(""); toast.success("Project copied"); })
                          .catch((err: any) => toast.error(err.message));
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2"><Users className="h-3.5 w-3.5" /> Members ({members.length})</h4>
                    {detailsLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : (
                      <div className="space-y-1">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                            <span>{m.display_name || m.email || m.id}</span>
                            {m.role && <Badge variant="outline" className="text-[10px] h-4">{m.role}</Badge>}
                          </div>
                        ))}
                        {members.length === 0 && <p className="text-xs text-muted-foreground">No members</p>}
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2"><FileText className="h-3.5 w-3.5" /> Fields ({fields.length})</h4>
                    <div className="space-y-1">
                      {fields.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/30">
                          <span className="font-medium">{f.name}</span>
                          <Badge variant="outline" className="text-[10px] h-4">{f.type}</Badge>
                        </div>
                      ))}
                      {fields.length === 0 && <p className="text-xs text-muted-foreground">No custom fields</p>}
                    </div>
                  </div>

                  {/* Share Link */}
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2"><Link className="h-3.5 w-3.5" /> Share Link</h4>
                    {shareLink?.url ? (
                      <div className="flex items-center gap-2">
                        <a href={shareLink.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate">{shareLink.url}</a>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="min-h-[36px] text-xs" onClick={() => enableShareLink().then(() => toast.success("Share link enabled")).catch((err: any) => toast.error(err.message))}>
                        <Link className="h-3 w-3 mr-1" /> Enable Share Link
                      </Button>
                    )}
                  </div>

                  {/* Blocks viewer */}
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2"><Blocks className="h-3.5 w-3.5" /> Blocks ({blocks.length})</h4>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-1">
                        {blocks.map((b) => (
                          <div key={b.id} className="text-xs py-1 px-2 rounded bg-muted/30" style={{ marginLeft: (b.indent || 0) * 16 }}>
                            {b.content || <span className="text-muted-foreground italic">Empty block</span>}
                          </div>
                        ))}
                        {blocks.length === 0 && <p className="text-xs text-muted-foreground">No blocks</p>}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[500px] text-sm text-muted-foreground">
                  Select a project to view details
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════ */}
        {/* Tasks Tab */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="tasks" className="space-y-4">
          {!selectedProject ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <CheckSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p>Select a project from the Projects tab to manage tasks.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Tasks</h3>
                <Button variant="ghost" size="sm" onClick={refreshTasks} disabled={tasksLoading} className="min-h-[44px]">
                  <RefreshCw className={`h-4 w-4 ${tasksLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* Create task */}
              <div className="flex gap-2">
                <Input
                  placeholder="New task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="min-h-[44px] text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTaskTitle.trim()) {
                      createTask(newTaskTitle.trim()).then(() => { setNewTaskTitle(""); toast.success("Task created"); }).catch((err: any) => toast.error(err.message));
                    }
                  }}
                />
                <Button size="sm" className="min-h-[44px]" disabled={!newTaskTitle.trim()} onClick={() => createTask(newTaskTitle.trim()).then(() => { setNewTaskTitle(""); toast.success("Task created"); }).catch((err: any) => toast.error(err.message))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tasks list */}
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1">
                    {tasks.map((t) => (
                      <div key={t.id} className="rounded-md border border-border overflow-hidden">
                        <div
                          className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/30 ${selectedTaskId === t.id ? "bg-primary/5 border-primary" : ""}`}
                          onClick={() => { setSelectedTaskId(t.id); setExpandedTask(expandedTask === t.id ? null : t.id); }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                (t.completed ? uncompleteTask(t.id) : completeTask(t.id))
                                  .catch((err: any) => toast.error(err.message));
                              }}
                              className="shrink-0"
                            >
                              {t.completed ? <Undo2 className="h-4 w-4 text-yellow-500" /> : <Check className="h-4 w-4 text-muted-foreground" />}
                            </button>
                            <span className={`text-sm truncate ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                              {t.title || t.content || t.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Delete" onClick={(e) => { e.stopPropagation(); removeTask(t.id).catch((err: any) => toast.error(err.message)); }}>
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            {expandedTask === t.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </div>

                        {/* Expanded task quick actions */}
                        {expandedTask === t.id && (
                          <div className="border-t border-border p-2 bg-muted/20 space-y-2">
                            <div className="flex flex-wrap gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" onClick={() => moveTask(t.id).then(() => toast.success("Moved")).catch((err: any) => toast.error(err.message))}>
                                <ArrowUpDown className="h-3 w-3 mr-1" /> Move
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {tasks.length === 0 && !tasksLoading && <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>}
                  </div>
                </ScrollArea>

                {/* Task details panel */}
                <div>
                  {selectedTaskId ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Task Details</h4>
                        <Button variant="ghost" size="sm" onClick={refreshTaskDetails} disabled={taskDetailLoading}>
                          <RefreshCw className={`h-3.5 w-3.5 ${taskDetailLoading ? "animate-spin" : ""}`} />
                        </Button>
                      </div>

                      {/* Assignees */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <h5 className="text-xs font-semibold flex items-center gap-1"><Users className="h-3 w-3" /> Assignees</h5>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(taskAssignees) ? taskAssignees : []).map((a: any) => (
                            <Badge key={typeof a === "string" ? a : a.handle || a.id} variant="secondary" className="text-[10px] gap-1">
                              {typeof a === "string" ? a : a.display_name || a.handle || a.id}
                              <button onClick={() => removeAssignee(typeof a === "string" ? a : a.handle).then(() => toast.success("Removed")).catch((err: any) => toast.error(err.message))}>
                                <UserMinus className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Input placeholder="Handle..." value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="min-h-[32px] text-xs h-8" />
                          <Button size="sm" className="h-8 text-xs" disabled={!newAssignee.trim()} onClick={() => {
                            const handles = [...(Array.isArray(taskAssignees) ? taskAssignees.map((a: any) => typeof a === "string" ? a : a.handle) : []), newAssignee.trim()];
                            updateAssignees(handles).then(() => { setNewAssignee(""); toast.success("Assigned"); }).catch((err: any) => toast.error(err.message));
                          }}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <h5 className="text-xs font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date</h5>
                        {taskDate?.due && <p className="text-xs text-muted-foreground">Current: {taskDate.due}</p>}
                        <div className="flex gap-1">
                          <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="min-h-[32px] text-xs h-8" />
                          <Button size="sm" className="h-8 text-xs" disabled={!taskDueDate} onClick={() => {
                            updateDate(undefined, taskDueDate).then(() => { setTaskDueDate(""); toast.success("Date set"); }).catch((err: any) => toast.error(err.message));
                          }}>Set</Button>
                          {taskDate?.due && (
                            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => removeDate().then(() => toast.success("Date removed")).catch((err: any) => toast.error(err.message))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Note */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <h5 className="text-xs font-semibold flex items-center gap-1"><StickyNote className="h-3 w-3" /> Note</h5>
                        {taskNote?.value && (
                          <div className="text-xs bg-muted/30 rounded p-2">
                            <Badge variant="outline" className="text-[10px] h-4 mb-1">{taskNote.type}</Badge>
                            <p className="whitespace-pre-wrap">{taskNote.value}</p>
                          </div>
                        )}
                        <Textarea placeholder="Add a note..." value={taskNoteValue} onChange={(e) => setTaskNoteValue(e.target.value)} className="min-h-[60px] text-xs" />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-8 text-xs" disabled={!taskNoteValue.trim()} onClick={() => {
                            updateNote("text", taskNoteValue.trim()).then(() => { setTaskNoteValue(""); toast.success("Note saved"); }).catch((err: any) => toast.error(err.message));
                          }}>Save as Text</Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!taskNoteValue.trim()} onClick={() => {
                            updateNote("markdown", taskNoteValue.trim()).then(() => { setTaskNoteValue(""); toast.success("Note saved"); }).catch((err: any) => toast.error(err.message));
                          }}>Save as Markdown</Button>
                          {taskNote?.value && (
                            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => removeNote().then(() => toast.success("Note removed")).catch((err: any) => toast.error(err.message))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[500px] text-sm text-muted-foreground">
                      Select a task to view details
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════ */}
        {/* Agents Tab */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="agents" className="space-y-4">
          {!selectedFolder ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p>Select a folder from the Workspaces tab to browse agents.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Agents in folder</h3>
                <Button variant="ghost" size="sm" onClick={refreshAgents} disabled={agentsLoading} className="min-h-[44px]">
                  <RefreshCw className={`h-4 w-4 ${agentsLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* Create agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Create Agent</h4>
                  <div className="flex gap-2">
                    <Input placeholder="Agent name..." value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} className="min-h-[36px] text-xs" />
                    <Button size="sm" className="min-h-[36px] text-xs" disabled={!newAgentName.trim()} onClick={() => {
                      createAgent(newAgentName.trim()).then(() => { setNewAgentName(""); toast.success("Agent created"); }).catch((err: any) => toast.error(err.message));
                    }}>Create</Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Generate with AI</h4>
                  <div className="flex gap-2">
                    <Input placeholder="Describe the agent..." value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)} className="min-h-[36px] text-xs" />
                    <Button size="sm" className="min-h-[36px] text-xs" disabled={!generatePrompt.trim()} onClick={() => {
                      generateAgent(generatePrompt.trim()).then(() => { setGeneratePrompt(""); toast.success("Agent generated"); }).catch((err: any) => toast.error(err.message));
                    }}>Generate</Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Agents list */}
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {agents.map((a) => (
                      <div
                        key={a.id}
                        className={`rounded-lg border border-border p-3 cursor-pointer transition-colors hover:border-primary/30 ${selectedAgentId === a.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => setSelectedAgentId(a.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Bot className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              {a.data?.description && <p className="text-xs text-muted-foreground truncate">{a.data.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Delete" onClick={(e) => { e.stopPropagation(); removeAgent(a.id).then(() => toast.success("Deleted")).catch((err: any) => toast.error(err.message)); }}>
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {agents.length === 0 && !agentsLoading && <p className="text-center text-sm text-muted-foreground py-8">No agents in this folder</p>}
                  </div>
                </ScrollArea>

                {/* Agent details panel */}
                <div>
                  {selectedAgentId ? (
                    <div className="space-y-3">
                      {/* Agent info */}
                      {agentDetail && (
                        <div className="rounded-lg border border-border p-3 space-y-2">
                          <h4 className="text-xs font-semibold">Agent Info</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Name:</span> {agentDetail.name}</div>
                            {agentDetail.data?.tone && <div><span className="text-muted-foreground">Tone:</span> {agentDetail.data.tone}</div>}
                            {agentDetail.data?.language && <div><span className="text-muted-foreground">Language:</span> {agentDetail.data.language}</div>}
                            {agentDetail.data?.knowledgeEnabled !== undefined && <div><span className="text-muted-foreground">Knowledge:</span> {agentDetail.data.knowledgeEnabled ? "Enabled" : "Disabled"}</div>}
                          </div>
                          {agentDetail.data?.commands && agentDetail.data.commands.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Commands:</p>
                              <div className="flex flex-wrap gap-1">
                                {agentDetail.data.commands.map((c) => (
                                  <Badge key={c.id} variant="outline" className="text-[10px]">{c.name}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Public access */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Public Access</h4>
                        {publicAgent?.publicUrl ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">Public</Badge>
                            <a href={publicAgent.publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate">{publicAgent.publicUrl}</a>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="min-h-[36px] text-xs" onClick={() => enablePublicAccess().then(() => toast.success("Public access enabled")).catch((err: any) => toast.error(err.message))}>
                            <Globe className="h-3 w-3 mr-1" /> Enable Public Access
                          </Button>
                        )}
                      </div>

                      {/* Knowledge management */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Knowledge</h4>
                        <div className="flex gap-1">
                          <Input placeholder="Project ID" value={knowledgeProjectId} onChange={(e) => setKnowledgeProjectId(e.target.value)} className="min-h-[32px] text-xs h-8" />
                          <Button size="sm" className="h-8 text-xs" disabled={!knowledgeProjectId.trim()} onClick={() => {
                            addKnowledgeProject(knowledgeProjectId.trim()).then(() => { setKnowledgeProjectId(""); toast.success("Project knowledge added"); }).catch((err: any) => toast.error(err.message));
                          }}>
                            <Plus className="h-3 w-3 mr-1" /> Project
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Input placeholder="Media ID" value={knowledgeMediaId} onChange={(e) => setKnowledgeMediaId(e.target.value)} className="min-h-[32px] text-xs h-8" />
                          <Button size="sm" className="h-8 text-xs" disabled={!knowledgeMediaId.trim()} onClick={() => {
                            addKnowledgeMedia(knowledgeMediaId.trim()).then(() => { setKnowledgeMediaId(""); toast.success("Media knowledge added"); }).catch((err: any) => toast.error(err.message));
                          }}>
                            <Plus className="h-3 w-3 mr-1" /> Media
                          </Button>
                        </div>
                      </div>

                      {/* Agent prompt */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Prompt Agent</h4>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ask the agent..."
                            value={agentPrompt}
                            onChange={(e) => setAgentPrompt(e.target.value)}
                            className="min-h-[36px] text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && agentPrompt.trim() && selectedAgentId) {
                                promptAgent(selectedAgentId, agentPrompt.trim()).then(() => setAgentPrompt(""));
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            className="min-h-[36px]"
                            disabled={!agentPrompt.trim() || agentPrompting}
                            onClick={() => {
                              if (selectedAgentId) promptAgent(selectedAgentId, agentPrompt.trim()).then(() => setAgentPrompt(""));
                            }}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {agentPrompting && <p className="text-xs text-muted-foreground">Thinking...</p>}
                        {agentResponse && (
                          <div className="rounded-lg border border-border p-3 bg-muted/30">
                            <p className="text-xs text-muted-foreground mb-1">Response:</p>
                            <p className="text-sm whitespace-pre-wrap">{agentResponse}</p>
                          </div>
                        )}
                      </div>

                      {/* Conversations */}
                      <div className="rounded-lg border border-border p-3 space-y-2">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Conversations ({agentConversations.length})</h4>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-1">
                            {agentConversations.map((c) => (
                              <div key={c.id} className="rounded-md border border-border overflow-hidden">
                                <div
                                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/30 text-xs"
                                  onClick={async () => {
                                    if (expandedConvo === c.id) {
                                      setExpandedConvo(null);
                                      setConvoMessages([]);
                                    } else {
                                      setExpandedConvo(c.id);
                                      try {
                                        const data = await getConversation(c.id);
                                        setConvoMessages(data?.item?.messages || data?.messages || []);
                                      } catch { setConvoMessages([]); }
                                    }
                                  }}
                                >
                                  <span className="truncate">{c.title || c.id}</span>
                                  {expandedConvo === c.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </div>
                                {expandedConvo === c.id && convoMessages.length > 0 && (
                                  <div className="border-t border-border p-2 bg-muted/20 space-y-1 max-h-[150px] overflow-y-auto">
                                    {convoMessages.map((m: any, i: number) => (
                                      <div key={i} className={`text-xs p-1.5 rounded ${m.role === "assistant" ? "bg-primary/10" : "bg-muted/50"}`}>
                                        <span className="font-medium text-[10px] uppercase text-muted-foreground">{m.role}: </span>
                                        {m.content}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {agentConversations.length === 0 && <p className="text-xs text-muted-foreground">No conversations</p>}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[500px] text-sm text-muted-foreground">
                      Select an agent to view details
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════ */}
        {/* Media Tab */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="media" className="space-y-4">
          {!selectedFolder ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Image className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p>Select a folder from the Workspaces tab to browse media.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Media in folder</h3>
                <Button variant="ghost" size="sm" onClick={refreshFolderDetails} disabled={folderDetailLoading} className="min-h-[44px]">
                  <RefreshCw className={`h-4 w-4 ${folderDetailLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {medias.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name || m.id}</p>
                          {m.kind && <Badge variant="outline" className="text-[10px]">{m.kind}</Badge>}
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                          deleteMediaItem(m.id).then(() => { toast.success("Media deleted"); refreshFolderDetails(); }).catch((err: any) => toast.error(err.message));
                        }}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{m.id}</p>
                    </div>
                  ))}
                  {medias.length === 0 && !folderDetailLoading && (
                    <p className="text-center text-sm text-muted-foreground py-8 col-span-full">No media files in this folder</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════ */}
        {/* Templates Tab */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="templates" className="space-y-4">
          {!selectedFolder ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <LayoutTemplate className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p>Select a folder from the Workspaces tab to browse templates.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Project Templates in folder</h3>
                <Button variant="ghost" size="sm" onClick={refreshFolderDetails} disabled={folderDetailLoading} className="min-h-[44px]">
                  <RefreshCw className={`h-4 w-4 ${folderDetailLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-lg border border-border p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name || t.id}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{t.id}</p>
                      </div>
                      <Button size="sm" className="min-h-[36px] text-xs shrink-0" onClick={() => {
                        createFromTemplate(t.id).then(() => { toast.success("Project created from template"); refreshProjects(); }).catch((err: any) => toast.error(err.message));
                      }}>
                        <Plus className="h-3 w-3 mr-1" /> Use Template
                      </Button>
                    </div>
                  ))}
                  {templates.length === 0 && !folderDetailLoading && (
                    <p className="text-center text-sm text-muted-foreground py-8">No templates in this folder</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════ */}
        {/* Activity Log Tab */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <Button variant="ghost" size="sm" onClick={refreshLogs} disabled={logsLoading} className="min-h-[44px]">
              <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={log.status === "success" ? "secondary" : "destructive"} className="text-[10px]">
                      {log.status}
                    </Badge>
                    <span className="text-sm font-medium">{log.action}</span>
                    <Badge variant="outline" className="text-[10px]">{log.entity_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                    {log.entity_id && ` \u00b7 ${log.entity_id.slice(0, 12)}...`}
                  </p>
                </div>
              ))}
              {logs.length === 0 && !logsLoading && (
                <p className="text-center text-sm text-muted-foreground py-8">No activity yet</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskadeTab;
