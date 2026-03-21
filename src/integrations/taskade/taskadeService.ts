import { getAccessToken } from "@/lib/supabase-helpers";

const TASKADE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/taskade`;

async function callTaskade(action: string, payload: Record<string, any> = {}): Promise<any> {
  const token = await getAccessToken();
  const resp = await fetch(TASKADE_FN_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    const err = data?.error || `Taskade API error (${resp.status})`;
    throw new Error(err);
  }
  return data;
}

// ── Connection ──
export const testConnection = () => callTaskade("test_connection");

// ── Workspaces ──
export const listWorkspaces = () => callTaskade("list_workspaces");
export const listWorkspaceFolders = (workspaceId: string) =>
  callTaskade("list_workspace_folders", { workspace_id: workspaceId });
export const createWorkspaceProject = (workspaceId: string, title: string, content?: string) =>
  callTaskade("create_workspace_project", { workspace_id: workspaceId, title, content });

// ── Folders ──
export const listFolderProjects = (folderId: string) =>
  callTaskade("list_folder_projects", { folder_id: folderId });
export const listFolderAgents = (folderId: string) =>
  callTaskade("list_folder_agents", { folder_id: folderId });
export const createFolderAgent = (folderId: string, name: string, description?: string) =>
  callTaskade("create_folder_agent", { folder_id: folderId, name, description });

// ── Projects ──
export const listProjects = () => callTaskade("list_projects");
export const createProject = (title: string, workspaceId?: string, content?: string) =>
  callTaskade("create_project", { title, workspace_id: workspaceId, content });
export const getProject = (projectId: string) =>
  callTaskade("get_project", { project_id: projectId });
export const updateProject = (projectId: string, title?: string, content?: string) =>
  callTaskade("update_project", { project_id: projectId, title, content });
export const deleteProject = (projectId: string) =>
  callTaskade("delete_project", { project_id: projectId });

// ── Tasks ──
export const listTasks = (projectId: string) =>
  callTaskade("list_tasks", { project_id: projectId });
export const createTask = (projectId: string, title: string, description?: string, dueDate?: string) =>
  callTaskade("create_task", { project_id: projectId, title, description, due_date: dueDate });
export const updateTask = (taskId: string, updates: { title?: string; description?: string; due_date?: string }) =>
  callTaskade("update_task", { task_id: taskId, ...updates });
export const deleteTask = (taskId: string) =>
  callTaskade("delete_task", { task_id: taskId });
export const completeTask = (taskId: string) =>
  callTaskade("complete_task", { task_id: taskId });

// ── Agents ──
export const promptAgent = (agentId: string, message: string, conversationId?: string) =>
  callTaskade("prompt_agent", { agent_id: agentId, message, conversation_id: conversationId });

// ── Sync logs ──
export const getSyncLogs = () => callTaskade("get_sync_logs");
