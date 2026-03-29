// ── Workspaces ──
export interface TaskadeWorkspace {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

// ── Folders ──
export interface TaskadeFolder {
  id: string;
  name: string;
  workspace_id?: string;
  created_at?: string;
}

// ── Projects ──
export interface TaskadeProject {
  id: string;
  title: string;
  name?: string;
  description?: string;
  workspace_id?: string;
  folder_id?: string;
  task_count?: number;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TaskadeProjectMember {
  id: string;
  display_name?: string;
  email?: string;
  role?: string;
  handle?: string;
}

export interface TaskadeProjectField {
  id: string;
  name: string;
  type: string;
  options?: any[];
}

export interface TaskadeBlock {
  id: string;
  content: string;
  type?: string;
  indent?: number;
  completed?: boolean;
}

export interface TaskadeShareLink {
  url?: string;
  enabled?: boolean;
}

// ── Tasks ──
export interface TaskadeTask {
  id: string;
  title: string;
  content?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
  assignees?: string[];
  project_id?: string;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskadeTaskDate {
  start?: string;
  due?: string;
}

export interface TaskadeTaskNote {
  type: "text" | "markdown";
  value: string;
}

export interface TaskadeTaskFieldValue {
  field_id: string;
  value: string | number;
}

// ── Agents ──
export interface TaskadeAgent {
  id: string;
  name: string;
  description?: string;
  folder_id?: string;
  space_id?: string;
  data?: {
    commands?: { name: string; prompt: string; id: string; mode?: string }[];
    description?: string;
    tone?: string;
    avatar?: { type: string; data: { value: string } };
    knowledgeEnabled?: boolean;
    language?: string;
  };
  public_url?: string;
  created_at?: string;
}

export interface TaskadeConversation {
  id: string;
  agent_id: string;
  title?: string;
  messages?: TaskadeMessage[];
  created_at?: string;
  updated_at?: string;
}

export interface TaskadeMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

// ── Media ──
export interface TaskadeMedia {
  id: string;
  space_id?: string;
  kind?: string;
  name?: string;
  url?: string;
  created_at?: string;
}

// ── Templates ──
export interface TaskadeTemplate {
  id: string;
  name: string;
}

// ── Sync Logs ──
export interface TaskadeSyncLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}
