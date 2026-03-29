import { useState, useEffect, useCallback } from "react";
import * as taskade from "@/integrations/taskade/taskadeService";
import type {
  TaskadeWorkspace,
  TaskadeProject,
  TaskadeTask,
  TaskadeAgent,
  TaskadeFolder,
  TaskadeSyncLog,
  TaskadeProjectMember,
  TaskadeProjectField,
  TaskadeBlock,
  TaskadeShareLink,
  TaskadeTaskDate,
  TaskadeTaskNote,
  TaskadeMedia,
  TaskadeTemplate,
  TaskadeConversation,
} from "@/integrations/taskade/types";

// ══════════════════════════════════════════
// ── Workspaces ──
// ══════════════════════════════════════════
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

// ══════════════════════════════════════════
// ── Folders ──
// ══════════════════════════════════════════
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

// ══════════════════════════════════════════
// ── Projects ──
// ══════════════════════════════════════════
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

  const create = useCallback(async (workspaceId: string, content: string) => {
    const data = await taskade.createProject(workspaceId, content);
    await fetch();
    return data;
  }, [fetch]);

  const remove = useCallback(async (projectId: string) => {
    await taskade.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const complete = useCallback(async (projectId: string) => {
    await taskade.completeProject(projectId);
    await fetch();
  }, [fetch]);

  const restore = useCallback(async (projectId: string) => {
    await taskade.restoreProject(projectId);
    await fetch();
  }, [fetch]);

  const copy = useCallback(async (projectId: string, folderId: string, title?: string) => {
    const data = await taskade.copyProject(projectId, folderId, title);
    await fetch();
    return data;
  }, [fetch]);

  return { projects, loading, error, refresh: fetch, create, remove, complete, restore, copy };
}

// ══════════════════════════════════════════
// ── Project Details ──
// ══════════════════════════════════════════
export function useProjectDetails(projectId: string | null) {
  const [members, setMembers] = useState<TaskadeProjectMember[]>([]);
  const [fields, setFields] = useState<TaskadeProjectField[]>([]);
  const [blocks, setBlocks] = useState<TaskadeBlock[]>([]);
  const [shareLink, setShareLink] = useState<TaskadeShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await taskade.getProjectMembers(projectId);
      setMembers(data?.items || []);
    } catch { /* ignore */ }
  }, [projectId]);

  const fetchFields = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await taskade.getProjectFields(projectId);
      setFields(data?.items || []);
    } catch { /* ignore */ }
  }, [projectId]);

  const fetchBlocks = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await taskade.getProjectBlocks(projectId);
      setBlocks(data?.items || []);
    } catch { /* ignore */ }
  }, [projectId]);

  const fetchShareLink = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await taskade.getProjectShareLink(projectId);
      setShareLink(data);
    } catch { /* ignore */ }
  }, [projectId]);

  const fetchAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMembers(), fetchFields(), fetchBlocks(), fetchShareLink()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchMembers, fetchFields, fetchBlocks, fetchShareLink]);

  useEffect(() => { if (projectId) fetchAll(); }, [projectId, fetchAll]);

  const enableShareLink = useCallback(async () => {
    if (!projectId) return;
    const data = await taskade.enableProjectShareLink(projectId);
    setShareLink(data);
    return data;
  }, [projectId]);

  return { members, fields, blocks, shareLink, loading, error, refresh: fetchAll, enableShareLink };
}

// ══════════════════════════════════════════
// ── Tasks ──
// ══════════════════════════════════════════
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

  const create = useCallback(async (content: string) => {
    if (!projectId) return;
    await taskade.createTask(projectId, content);
    await fetch();
  }, [projectId, fetch]);

  const update = useCallback(async (taskId: string, content: string) => {
    if (!projectId) return;
    await taskade.updateTask(projectId, taskId, content);
    await fetch();
  }, [projectId, fetch]);

  const complete = useCallback(async (taskId: string) => {
    if (!projectId) return;
    await taskade.completeTask(projectId, taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
  }, [projectId]);

  const uncomplete = useCallback(async (taskId: string) => {
    if (!projectId) return;
    await taskade.uncompleteTask(projectId, taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: false } : t)));
  }, [projectId]);

  const remove = useCallback(async (taskId: string) => {
    if (!projectId) return;
    await taskade.deleteTask(projectId, taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, [projectId]);

  const move = useCallback(async (taskId: string, afterId?: string, parentId?: string) => {
    if (!projectId) return;
    await taskade.moveTask(projectId, taskId, afterId, parentId);
    await fetch();
  }, [projectId, fetch]);

  return { tasks, loading, error, refresh: fetch, create, update, complete, uncomplete, remove, move };
}

// ══════════════════════════════════════════
// ── Task Details ──
// ══════════════════════════════════════════
export function useTaskDetails(projectId: string | null, taskId: string | null) {
  const [assignees, setAssignees] = useState<string[]>([]);
  const [date, setDate] = useState<TaskadeTaskDate | null>(null);
  const [note, setNote] = useState<TaskadeTaskNote | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!projectId || !taskId) return;
    setLoading(true);
    try {
      const [aData, dData, nData] = await Promise.all([
        taskade.getTaskAssignees(projectId, taskId).catch(() => null),
        taskade.getTaskDate(projectId, taskId).catch(() => null),
        taskade.getTaskNote(projectId, taskId).catch(() => null),
      ]);
      setAssignees(aData?.items || aData?.handles || []);
      setDate(dData?.item || dData || null);
      setNote(nData?.item || nData || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId, taskId]);

  useEffect(() => { if (projectId && taskId) fetchAll(); }, [projectId, taskId, fetchAll]);

  const updateAssignees = useCallback(async (handles: string[]) => {
    if (!projectId || !taskId) return;
    await taskade.updateTaskAssignees(projectId, taskId, handles);
    setAssignees(handles);
  }, [projectId, taskId]);

  const removeAssignee = useCallback(async (handle: string) => {
    if (!projectId || !taskId) return;
    await taskade.removeTaskAssignee(projectId, taskId, handle);
    setAssignees((prev) => prev.filter((a) => a !== handle));
  }, [projectId, taskId]);

  const updateDate = useCallback(async (start?: string, due?: string) => {
    if (!projectId || !taskId) return;
    await taskade.setTaskDate(projectId, taskId, start, due);
    setDate({ start, due });
  }, [projectId, taskId]);

  const removeDate = useCallback(async () => {
    if (!projectId || !taskId) return;
    await taskade.deleteTaskDate(projectId, taskId);
    setDate(null);
  }, [projectId, taskId]);

  const updateNote = useCallback(async (type: "text" | "markdown", value: string) => {
    if (!projectId || !taskId) return;
    await taskade.updateTaskNote(projectId, taskId, type, value);
    setNote({ type, value });
  }, [projectId, taskId]);

  const removeNote = useCallback(async () => {
    if (!projectId || !taskId) return;
    await taskade.deleteTaskNote(projectId, taskId);
    setNote(null);
  }, [projectId, taskId]);

  return {
    assignees, date, note, loading, refresh: fetchAll,
    updateAssignees, removeAssignee,
    updateDate, removeDate,
    updateNote, removeNote,
  };
}

// ══════════════════════════════════════════
// ── Agents ──
// ══════════════════════════════════════════
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

  const createAgent = useCallback(async (name: string, agentData?: any) => {
    if (!folderId) return;
    await taskade.createFolderAgent(folderId, name, agentData);
    await fetch();
  }, [folderId, fetch]);

  const generateAgent = useCallback(async (text: string) => {
    if (!folderId) return;
    const data = await taskade.generateFolderAgent(folderId, text);
    await fetch();
    return data;
  }, [folderId, fetch]);

  const removeAgent = useCallback(async (agentId: string) => {
    await taskade.deleteAgent(agentId);
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
  }, []);

  const renameAgent = useCallback(async (agentId: string, name: string) => {
    await taskade.updateAgent(agentId, name);
    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, name } : a)));
  }, []);

  return { agents, loading, error, refresh: fetch, createAgent, generateAgent, removeAgent, renameAgent };
}

// ══════════════════════════════════════════
// ── Agent Details ──
// ══════════════════════════════════════════
export function useAgentDetails(agentId: string | null) {
  const [agent, setAgent] = useState<TaskadeAgent | null>(null);
  const [publicAgent, setPublicAgent] = useState<any>(null);
  const [conversations, setConversations] = useState<TaskadeConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await taskade.getAgent(agentId);
      setAgent(data?.item || data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const fetchPublicAgent = useCallback(async () => {
    if (!agentId) return;
    try {
      const data = await taskade.getPublicAgent(agentId);
      setPublicAgent(data);
    } catch { /* might not be public */ }
  }, [agentId]);

  const fetchConversations = useCallback(async () => {
    if (!agentId) return;
    try {
      const data = await taskade.getAgentConversations(agentId);
      setConversations(data?.items || []);
    } catch { /* ignore */ }
  }, [agentId]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchAgent(), fetchPublicAgent(), fetchConversations()]);
  }, [fetchAgent, fetchPublicAgent, fetchConversations]);

  useEffect(() => { if (agentId) fetchAll(); }, [agentId, fetchAll]);

  const enablePublicAccess = useCallback(async () => {
    if (!agentId) return;
    const data = await taskade.enableAgentPublicAccess(agentId);
    setPublicAgent(data);
    return data;
  }, [agentId]);

  const addKnowledgeProject = useCallback(async (projectId: string) => {
    if (!agentId) return;
    return taskade.addAgentKnowledgeProject(agentId, projectId);
  }, [agentId]);

  const addKnowledgeMedia = useCallback(async (mediaId: string) => {
    if (!agentId) return;
    return taskade.addAgentKnowledgeMedia(agentId, mediaId);
  }, [agentId]);

  const removeKnowledgeProject = useCallback(async (projectId: string) => {
    if (!agentId) return;
    return taskade.removeAgentKnowledgeProject(agentId, projectId);
  }, [agentId]);

  const removeKnowledgeMedia = useCallback(async (mediaId: string) => {
    if (!agentId) return;
    return taskade.removeAgentKnowledgeMedia(agentId, mediaId);
  }, [agentId]);

  const getConversation = useCallback(async (convoId: string) => {
    if (!agentId) return null;
    return taskade.getAgentConversation(agentId, convoId);
  }, [agentId]);

  return {
    agent, publicAgent, conversations, loading, error,
    refresh: fetchAll, enablePublicAccess,
    addKnowledgeProject, addKnowledgeMedia,
    removeKnowledgeProject, removeKnowledgeMedia,
    getConversation,
  };
}

// ══════════════════════════════════════════
// ── Agent Prompting ──
// ══════════════════════════════════════════
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

// ══════════════════════════════════════════
// ── Folder Details (Media & Templates) ──
// ══════════════════════════════════════════
export function useFolderDetails(folderId: string | null) {
  const [medias, setMedias] = useState<TaskadeMedia[]>([]);
  const [templates, setTemplates] = useState<TaskadeTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMedias = useCallback(async () => {
    if (!folderId) return;
    try {
      const data = await taskade.getFolderMedias(folderId);
      setMedias(data?.items || []);
    } catch { /* ignore */ }
  }, [folderId]);

  const fetchTemplates = useCallback(async () => {
    if (!folderId) return;
    try {
      const data = await taskade.getFolderTemplates(folderId);
      setTemplates(data?.items || []);
    } catch { /* ignore */ }
  }, [folderId]);

  const fetchAll = useCallback(async () => {
    if (!folderId) return;
    setLoading(true);
    await Promise.all([fetchMedias(), fetchTemplates()]);
    setLoading(false);
  }, [folderId, fetchMedias, fetchTemplates]);

  useEffect(() => { if (folderId) fetchAll(); }, [folderId, fetchAll]);

  const createFromTemplate = useCallback(async (templateId: string) => {
    if (!folderId) return;
    return taskade.createProjectFromTemplate(folderId, templateId);
  }, [folderId]);

  return { medias, templates, loading, refresh: fetchAll, createFromTemplate };
}

// ══════════════════════════════════════════
// ── Media ──
// ══════════════════════════════════════════
export function useMedia() {
  const [loading, setLoading] = useState(false);

  const get = useCallback(async (mediaId: string) => {
    setLoading(true);
    try {
      return await taskade.getMedia(mediaId);
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (mediaId: string) => {
    setLoading(true);
    try {
      return await taskade.deleteMedia(mediaId);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, get, remove };
}

// ══════════════════════════════════════════
// ── Sync Logs ──
// ══════════════════════════════════════════
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
