import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CheckSquare, FolderOpen, Bot, Activity, Wifi, WifiOff,
  Plus, Trash2, Check, Send, RefreshCw, ChevronRight, ExternalLink, AlertTriangle,
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
} from "@/hooks/useTaskade";

const TaskadeTab = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  const { workspaces, loading: wsLoading, error: wsError, notConfigured, refresh: refreshWs } = useTaskadeWorkspaces();
  const { projects, loading: projLoading, error: projError, refresh: refreshProjects, create: createProject, remove: removeProject } = useTaskadeProjects();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { folders, loading: foldersLoading, refresh: refreshFolders } = useTaskadeFolders(selectedWorkspace);
  const { tasks, loading: tasksLoading, refresh: refreshTasks, create: createTask, complete: completeTask, remove: removeTask } = useTaskadeTasks(selectedProject);
  const { agents, loading: agentsLoading, refresh: refreshAgents } = useTaskadeAgents(selectedFolder);
  const { response: agentResponse, loading: agentPrompting, prompt: promptAgent } = useTaskadeAgent();
  const { logs, loading: logsLoading, refresh: refreshLogs } = useTaskadeSyncLogs();

  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

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
              Taskade Settings → API <ExternalLink className="h-3 w-3" />
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
            <CheckSquare className="h-3.5 w-3.5" /> Projects & Tasks
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <Bot className="h-3.5 w-3.5" /> Agents
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs min-h-[44px] flex-shrink-0">
            <Activity className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* Workspaces */}
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

        {/* Projects & Tasks */}
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
                if (e.key === "Enter" && newProjectTitle.trim()) {
                  createProject(newProjectTitle.trim(), selectedWorkspace || undefined)
                    .then(() => { setNewProjectTitle(""); toast.success("Project created"); })
                    .catch((err: any) => toast.error(err.message));
                }
              }}
            />
            <Button
              size="sm"
              className="min-h-[44px]"
              disabled={!newProjectTitle.trim()}
              onClick={() => {
                createProject(newProjectTitle.trim(), selectedWorkspace || undefined)
                  .then(() => { setNewProjectTitle(""); toast.success("Project created"); })
                  .catch((err: any) => toast.error(err.message));
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {projError && <p className="text-sm text-destructive">{projError}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Projects list */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-lg border border-border p-3 cursor-pointer transition-colors hover:border-primary/30 ${selectedProject === p.id ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => setSelectedProject(p.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.title || p.id}</p>
                        {p.task_count !== undefined && (
                          <p className="text-xs text-muted-foreground">{p.task_count} tasks</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); removeProject(p.id).then(() => toast.success("Deleted")).catch((err: any) => toast.error(err.message)); }}>
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

            {/* Tasks for selected project */}
            <div>
              {selectedProject ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Tasks</h4>
                    <Button variant="ghost" size="sm" onClick={refreshTasks} disabled={tasksLoading}>
                      <RefreshCw className={`h-3.5 w-3.5 ${tasksLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
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
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-1">
                      {tasks.map((t) => (
                        <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <button onClick={() => completeTask(t.id).catch((err: any) => toast.error(err.message))} className="shrink-0">
                              <Check className={`h-4 w-4 ${t.completed ? "text-green-500" : "text-muted-foreground"}`} />
                            </button>
                            <span className={`text-sm truncate ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeTask(t.id).catch((err: any) => toast.error(err.message))}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      {tasks.length === 0 && !tasksLoading && <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
                  Select a project to view tasks
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Agents */}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {agents.map((a) => (
                      <div
                        key={a.id}
                        className={`rounded-lg border border-border p-3 cursor-pointer transition-colors hover:border-primary/30 ${selectedAgentId === a.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => setSelectedAgentId(a.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{a.name}</p>
                            {a.description && <p className="text-xs text-muted-foreground truncate">{a.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {agents.length === 0 && !agentsLoading && <p className="text-center text-sm text-muted-foreground py-8">No agents in this folder</p>}
                  </div>
                </ScrollArea>

                {/* Agent prompt */}
                <div>
                  {selectedAgentId ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Prompt Agent</h4>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ask the agent..."
                          value={agentPrompt}
                          onChange={(e) => setAgentPrompt(e.target.value)}
                          className="min-h-[44px]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && agentPrompt.trim() && selectedAgentId) {
                              promptAgent(selectedAgentId, agentPrompt.trim()).then(() => setAgentPrompt(""));
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="min-h-[44px]"
                          disabled={!agentPrompt.trim() || agentPrompting}
                          onClick={() => {
                            if (selectedAgentId) promptAgent(selectedAgentId, agentPrompt.trim()).then(() => setAgentPrompt(""));
                          }}
                        >
                          <Send className="h-4 w-4" />
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
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
                      Select an agent to prompt
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Activity Log */}
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
                    {log.entity_id && ` · ${log.entity_id.slice(0, 12)}...`}
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
