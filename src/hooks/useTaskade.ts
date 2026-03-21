import { useState, useEffect, useCallback } from "react";
import * as taskade from "@/integrations/taskade/taskadeService";
import type {
  TaskadeWorkspace,
  TaskadeProject,
  TaskadeTask,
  TaskadeAgent,
  TaskadeFolder,
  TaskadeSyncLog,
} from "@/integrations/taskade/types";

// ── Workspaces ──
export function useTaskadeWorkspaces() {
  const [workspaces, setWorkspaces] = useState<TaskadeWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskade.listWorkspaces();
      setWorkspaces(data?.items || data?.workspaces || (Array.isArray(data) ? data : []));
      setNotConfigured(false);
    } catch (e: any) {
      if (e.message?.includes("NOT_CONFIGURED") || e.message?.includes("not configured")) {
        setNotConfigured(true);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { workspaces, loading, error, notConfigured, refresh: fetch };
}

// ── Projects ──
export function useTaskadeProjects() {
  const [projects, setProjects] = useState<TaskadeProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskade.listProjects();
      setProjects(data?.items || data?.projects || (Array.isArray(data) ? data : []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (title: string, workspaceId?: string) => {
    const data = await taskade.createProject(title, workspaceId);
    await fetch();
    return data;
  }, [fetch]);

  const remove = useCallback(async (projectId: string) => {
    await taskade.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  return { projects, loading, error, refresh: fetch, create, remove };
}

// ── Tasks ──
export function useTaskadeTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<TaskadeTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await taskade.listTasks(projectId);
      setTasks(data?.items || data?.tasks || (Array.isArray(data) ? data : []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { if (projectId) fetch(); }, [projectId, fetch]);

  const create = useCallback(async (title: string, description?: string) => {
    if (!projectId) return;
    await taskade.createTask(projectId, title, description);
    await fetch();
  }, [projectId, fetch]);

  const complete = useCallback(async (taskId: string) => {
    await taskade.completeTask(taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
  }, []);

  const remove = useCallback(async (taskId: string) => {
    await taskade.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  return { tasks, loading, error, refresh: fetch, create, complete, remove };
}

// ── Agents ──
export function useTaskadeAgents(folderId: string | null) {
  const [agents, setAgents] = useState<TaskadeAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!folderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await taskade.listFolderAgents(folderId);
      setAgents(data?.items || data?.agents || (Array.isArray(data) ? data : []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => { if (folderId) fetch(); }, [folderId, fetch]);

  return { agents, loading, error, refresh: fetch };
}

// ── Agent prompting ──
export function useTaskadeAgent() {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = useCallback(async (agentId: string, message: string, conversationId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskade.promptAgent(agentId, message, conversationId);
      setResponse(data?.response || data?.message?.content || JSON.stringify(data));
      return data;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { response, loading, error, prompt };
}

// ── Sync logs ──
export function useTaskadeSyncLogs() {
  const [logs, setLogs] = useState<TaskadeSyncLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskade.getSyncLogs();
      setLogs(data?.logs || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  return { logs, loading, refresh: fetch };
}

// ── Folders ──
export function useTaskadeFolders(workspaceId: string | null) {
  const [folders, setFolders] = useState<TaskadeFolder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await taskade.listWorkspaceFolders(workspaceId);
      setFolders(data?.items || data?.folders || (Array.isArray(data) ? data : []));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { if (workspaceId) fetch(); }, [workspaceId, fetch]);

  return { folders, loading, refresh: fetch };
}
