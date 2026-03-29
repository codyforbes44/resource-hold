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

// ══════════════════════════════════════════
// ── Connection ──
// ══════════════════════════════════════════
export const testConnection = () => callTaskade("test_connection");

// ══════════════════════════════════════════
// ── Workspaces ──
// ══════════════════════════════════════════
export const listWorkspaces = () => callTaskade("list_workspaces");

export const listWorkspaceFolders = (workspaceId: string) =>
  callTaskade("list_workspace_folders", { workspace_id: workspaceId });

export const createWorkspaceProject = (workspaceId: string, content: string, contentType?: string) =>
  callTaskade("create_workspace_project", { workspace_id: workspaceId, content, content_type: contentType });

// ══════════════════════════════════════════
// ── Folders ──
// ══════════════════════════════════════════
export const listFolderProjects = (folderId: string) =>
  callTaskade("list_folder_projects", { folder_id: folderId });

export const listFolderAgents = (folderId: string, limit?: number, page?: number) =>
  callTaskade("list_folder_agents", { folder_id: folderId, limit, page });

export const createFolderAgent = (folderId: string, name: string, data?: any) =>
  callTaskade("create_folder_agent", { folder_id: folderId, name, data });

export const generateFolderAgent = (folderId: string, text: string) =>
  callTaskade("generate_folder_agent", { folder_id: folderId, text });

export const getFolderMedias = (folderId: string, limit?: number, page?: number) =>
  callTaskade("get_folder_medias", { folder_id: folderId, limit, page });

export const getFolderTemplates = (folderId: string, limit?: number, page?: number) =>
  callTaskade("get_folder_templates", { folder_id: folderId, limit, page });

// ══════════════════════════════════════════
// ── Projects ──
// ══════════════════════════════════════════
export const listProjects = () => callTaskade("list_projects");
export const getMyProjects = () => callTaskade("get_my_projects");

export const createProject = (workspaceId: string, content: string, contentType?: string) =>
  callTaskade("create_project", { workspace_id: workspaceId, content, content_type: contentType });

export const getProject = (projectId: string) =>
  callTaskade("get_project", { project_id: projectId });

export const updateProject = (projectId: string, content: string, contentType?: string) =>
  callTaskade("update_project", { project_id: projectId, content, content_type: contentType });

export const deleteProject = (projectId: string) =>
  callTaskade("delete_project", { project_id: projectId });

export const completeProject = (projectId: string) =>
  callTaskade("complete_project", { project_id: projectId });

export const restoreProject = (projectId: string) =>
  callTaskade("restore_project", { project_id: projectId });

export const copyProject = (projectId: string, folderId: string, projectTitle?: string) =>
  callTaskade("copy_project", { project_id: projectId, folder_id: folderId, project_title: projectTitle });

export const createProjectFromTemplate = (folderId: string, templateId: string) =>
  callTaskade("create_project_from_template", { folder_id: folderId, template_id: templateId });

export const getProjectMembers = (projectId: string, limit?: number, page?: number) =>
  callTaskade("get_project_members", { project_id: projectId, limit, page });

export const getProjectFields = (projectId: string) =>
  callTaskade("get_project_fields", { project_id: projectId });

export const getProjectShareLink = (projectId: string) =>
  callTaskade("get_project_share_link", { project_id: projectId });

export const enableProjectShareLink = (projectId: string) =>
  callTaskade("enable_project_share_link", { project_id: projectId });

export const getProjectBlocks = (projectId: string, limit?: number, after?: string) =>
  callTaskade("get_project_blocks", { project_id: projectId, limit, after });

export const getProjectTasks = (projectId: string, limit?: number, after?: string) =>
  callTaskade("get_project_tasks", { project_id: projectId, limit, after });

// ══════════════════════════════════════════
// ── Tasks ──
// ══════════════════════════════════════════
export const listTasks = (projectId: string) =>
  callTaskade("list_tasks", { project_id: projectId });

export const getTask = (projectId: string, taskId: string) =>
  callTaskade("get_task", { project_id: projectId, task_id: taskId });

export const createTask = (projectId: string, content: string, contentType?: string) =>
  callTaskade("create_task", { project_id: projectId, title: content, content_type: contentType });

export const updateTask = (projectId: string, taskId: string, content: string, contentType?: string) =>
  callTaskade("update_task", { project_id: projectId, task_id: taskId, content, content_type: contentType });

export const deleteTask = (projectId: string, taskId: string) =>
  callTaskade("delete_task", { project_id: projectId, task_id: taskId });

export const completeTask = (projectId: string, taskId: string) =>
  callTaskade("complete_task", { project_id: projectId, task_id: taskId });

export const uncompleteTask = (projectId: string, taskId: string) =>
  callTaskade("uncomplete_task", { project_id: projectId, task_id: taskId });

export const moveTask = (projectId: string, taskId: string, afterId?: string, parentId?: string) =>
  callTaskade("move_task", { project_id: projectId, task_id: taskId, after_id: afterId, parent_id: parentId });

export const getTaskAssignees = (projectId: string, taskId: string) =>
  callTaskade("get_task_assignees", { project_id: projectId, task_id: taskId });

export const updateTaskAssignees = (projectId: string, taskId: string, handles: string[]) =>
  callTaskade("update_task_assignees", { project_id: projectId, task_id: taskId, handles });

export const removeTaskAssignee = (projectId: string, taskId: string, handle: string) =>
  callTaskade("remove_task_assignee", { project_id: projectId, task_id: taskId, handle });

export const getTaskDate = (projectId: string, taskId: string) =>
  callTaskade("get_task_date", { project_id: projectId, task_id: taskId });

export const setTaskDate = (projectId: string, taskId: string, start?: string, due?: string) =>
  callTaskade("set_task_date", { project_id: projectId, task_id: taskId, start, due });

export const deleteTaskDate = (projectId: string, taskId: string) =>
  callTaskade("delete_task_date", { project_id: projectId, task_id: taskId });

export const getTaskNote = (projectId: string, taskId: string) =>
  callTaskade("get_task_note", { project_id: projectId, task_id: taskId });

export const updateTaskNote = (projectId: string, taskId: string, noteType: "text" | "markdown", value: string) =>
  callTaskade("update_task_note", { project_id: projectId, task_id: taskId, note_type: noteType, value });

export const deleteTaskNote = (projectId: string, taskId: string) =>
  callTaskade("delete_task_note", { project_id: projectId, task_id: taskId });

export const getTaskField = (projectId: string, taskId: string, fieldId: string) =>
  callTaskade("get_task_field", { project_id: projectId, task_id: taskId, field_id: fieldId });

export const updateTaskField = (projectId: string, taskId: string, fieldId: string, value: string | number) =>
  callTaskade("update_task_field", { project_id: projectId, task_id: taskId, field_id: fieldId, value });

export const deleteTaskField = (projectId: string, taskId: string, fieldId: string) =>
  callTaskade("delete_task_field", { project_id: projectId, task_id: taskId, field_id: fieldId });

// ══════════════════════════════════════════
// ── Agents ──
// ══════════════════════════════════════════
export const getAgent = (agentId: string) =>
  callTaskade("get_agent", { agent_id: agentId });

export const updateAgent = (agentId: string, name: string) =>
  callTaskade("update_agent", { agent_id: agentId, name });

export const deleteAgent = (agentId: string) =>
  callTaskade("delete_agent", { agent_id: agentId });

export const enableAgentPublicAccess = (agentId: string) =>
  callTaskade("enable_agent_public_access", { agent_id: agentId });

export const getPublicAgent = (agentId: string) =>
  callTaskade("get_public_agent", { agent_id: agentId });

export const updatePublicAgent = (agentId: string, settings: Record<string, any>) =>
  callTaskade("update_public_agent", { agent_id: agentId, settings });

export const addAgentKnowledgeProject = (agentId: string, projectId: string) =>
  callTaskade("add_agent_knowledge_project", { agent_id: agentId, project_id: projectId });

export const addAgentKnowledgeMedia = (agentId: string, mediaId: string) =>
  callTaskade("add_agent_knowledge_media", { agent_id: agentId, media_id: mediaId });

export const removeAgentKnowledgeProject = (agentId: string, projectId: string) =>
  callTaskade("remove_agent_knowledge_project", { agent_id: agentId, project_id: projectId });

export const removeAgentKnowledgeMedia = (agentId: string, mediaId: string) =>
  callTaskade("remove_agent_knowledge_media", { agent_id: agentId, media_id: mediaId });

export const getAgentConversations = (agentId: string, limit?: number, page?: number) =>
  callTaskade("get_agent_conversations", { agent_id: agentId, limit, page });

export const getAgentConversation = (agentId: string, conversationId: string) =>
  callTaskade("get_agent_conversation", { agent_id: agentId, conversation_id: conversationId });

export const promptAgent = (agentId: string, message: string, conversationId?: string) =>
  callTaskade("prompt_agent", { agent_id: agentId, message, conversation_id: conversationId });

// ══════════════════════════════════════════
// ── Media ──
// ══════════════════════════════════════════
export const getMedia = (mediaId: string) =>
  callTaskade("get_media", { media_id: mediaId });

export const deleteMedia = (mediaId: string) =>
  callTaskade("delete_media", { media_id: mediaId });

// ══════════════════════════════════════════
// ── Sync Logs ──
// ══════════════════════════════════════════
export const getSyncLogs = () => callTaskade("get_sync_logs");
