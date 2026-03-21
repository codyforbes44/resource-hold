import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TASKADE_BASE = "https://www.taskade.com/api/v1";

function getTaskadeKey(): string | null {
  return Deno.env.get("TASKADE_API_KEY") || null;
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function taskadeRequest(
  path: string,
  method: string = "GET",
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: any }> {
  const apiKey = getTaskadeKey();
  if (!apiKey) return { ok: false, status: 401, data: { error: "TASKADE_API_KEY not configured" } };

  const url = `${TASKADE_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  let attempts = 0;
  while (attempts < 3) {
    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 429 && attempts < 2) {
        attempts++;
        await new Promise((r) => setTimeout(r, 1000 * attempts));
        continue;
      }
      return { ok: resp.ok, status: resp.status, data };
    } catch (e) {
      attempts++;
      if (attempts >= 3) return { ok: false, status: 500, data: { error: e instanceof Error ? e.message : "Unknown" } };
      await new Promise((r) => setTimeout(r, 1000 * attempts));
    }
  }
  return { ok: false, status: 500, data: { error: "Max retries exceeded" } };
}

async function logSync(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  status: string,
  metadata: Record<string, any> = {},
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceRoleKey);
    await client.from("taskade_sync_log").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      status,
      metadata,
    });
  } catch { /* best effort */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "Unauthorized");

    // Check if API key is configured
    if (!getTaskadeKey()) {
      return new Response(
        JSON.stringify({ error: "TASKADE_API_KEY not configured", code: "NOT_CONFIGURED" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const action = body.action || url.searchParams.get("action") || "";

    let result: { ok: boolean; status: number; data: any };

    switch (action) {
      // ── Connection test ──
      case "test_connection":
        result = await taskadeRequest("/workspaces");
        await logSync(user.id, "test_connection", "connection", null, result.ok ? "success" : "error");
        break;

      // ── Workspaces ──
      case "list_workspaces":
        result = await taskadeRequest("/workspaces");
        break;

      case "list_workspace_folders":
        result = await taskadeRequest(`/workspaces/${body.workspace_id}/folders`);
        break;

      case "create_workspace_project":
        result = await taskadeRequest(`/workspaces/${body.workspace_id}/projects`, "POST", {
          title: body.title,
          content: body.content || "",
        });
        await logSync(user.id, "create_project", "project", result.data?.id, result.ok ? "success" : "error");
        break;

      // ── Folders ──
      case "list_folder_projects":
        result = await taskadeRequest(`/folders/${body.folder_id}/projects`);
        break;

      case "list_folder_agents":
        result = await taskadeRequest(`/folders/${body.folder_id}/agents`);
        break;

      case "create_folder_agent":
        result = await taskadeRequest(`/folders/${body.folder_id}/agents`, "POST", {
          name: body.name,
          description: body.description || "",
        });
        await logSync(user.id, "create_agent", "agent", result.data?.id, result.ok ? "success" : "error");
        break;

      // ── Projects ──
      case "list_projects":
        result = await taskadeRequest("/projects");
        break;

      case "create_project":
        result = await taskadeRequest("/projects", "POST", {
          title: body.title,
          content: body.content || "",
          workspace_id: body.workspace_id,
        });
        await logSync(user.id, "create_project", "project", result.data?.id, result.ok ? "success" : "error");
        break;

      case "get_project":
        result = await taskadeRequest(`/projects/${body.project_id}`);
        break;

      case "update_project":
        result = await taskadeRequest(`/projects/${body.project_id}`, "PUT", {
          title: body.title,
          content: body.content,
        });
        await logSync(user.id, "update_project", "project", body.project_id, result.ok ? "success" : "error");
        break;

      case "delete_project":
        result = await taskadeRequest(`/projects/${body.project_id}`, "DELETE");
        await logSync(user.id, "delete_project", "project", body.project_id, result.ok ? "success" : "error");
        break;

      // ── Tasks ──
      case "list_tasks":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks`);
        break;

      case "create_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks`, "POST", {
          title: body.title,
          description: body.description || "",
          due_date: body.due_date,
          assignees: body.assignees,
        });
        await logSync(user.id, "create_task", "task", result.data?.id, result.ok ? "success" : "error");
        break;

      case "update_task":
        result = await taskadeRequest(`/tasks/${body.task_id}`, "PUT", {
          title: body.title,
          description: body.description,
          due_date: body.due_date,
          assignees: body.assignees,
        });
        await logSync(user.id, "update_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "delete_task":
        result = await taskadeRequest(`/tasks/${body.task_id}`, "DELETE");
        await logSync(user.id, "delete_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "complete_task":
        result = await taskadeRequest(`/tasks/${body.task_id}/complete`, "POST");
        await logSync(user.id, "complete_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      // ── Agents ──
      case "list_agents":
        result = await taskadeRequest(`/folders/${body.folder_id}/agents`);
        break;

      case "prompt_agent":
        result = await taskadeRequest(`/agents/${body.agent_id}/conversations`, "POST", {
          message: body.message,
          conversation_id: body.conversation_id,
        });
        await logSync(user.id, "prompt_agent", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      // ── Sync logs ──
      case "get_sync_logs": {
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const { data: logs } = await adminClient
          .from("taskade_sync_log")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        result = { ok: true, status: 200, data: { logs: logs || [] } };
        break;
      }

      default:
        return errorResponse(400, `Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Taskade proxy error:", e);
    return errorResponse(500, e instanceof Error ? e.message : "Unknown error");
  }
});
