export interface TaskadeWorkspace {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface TaskadeFolder {
  id: string;
  name: string;
  workspace_id?: string;
  created_at?: string;
}

export interface TaskadeProject {
  id: string;
  title: string;
  description?: string;
  workspace_id?: string;
  folder_id?: string;
  task_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TaskadeTask {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
  assignees?: string[];
  project_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskadeAgent {
  id: string;
  name: string;
  description?: string;
  folder_id?: string;
  created_at?: string;
}

export interface TaskadeConversation {
  id: string;
  agent_id: string;
  messages: TaskadeMessage[];
}

export interface TaskadeMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

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
