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
      // ══════════════════════════════════════════
      // ── Connection test ──
      // ══════════════════════════════════════════
      case "test_connection":
        result = await taskadeRequest("/workspaces");
        await logSync(user.id, "test_connection", "connection", null, result.ok ? "success" : "error");
        break;

      // ══════════════════════════════════════════
      // ── Workspaces ──
      // ══════════════════════════════════════════
      case "list_workspaces":
        result = await taskadeRequest("/workspaces");
        break;

      case "list_workspace_folders":
        result = await taskadeRequest(`/workspaces/${body.workspace_id}/folders`);
        break;

      case "create_workspace_project":
        result = await taskadeRequest(`/workspaces/${body.workspace_id}/projects`, "POST", {
          contentType: body.content_type || "text/markdown",
          content: body.content || body.title || "",
        });
        await logSync(user.id, "create_project", "project", result.data?.item?.id || null, result.ok ? "success" : "error");
        break;

      // ══════════════════════════════════════════
      // ── Folders ──
      // ══════════════════════════════════════════
      case "list_folder_projects":
        result = await taskadeRequest(`/folders/${body.folder_id}/projects`);
        break;

      case "list_folder_agents": {
        const fLimit = body.limit || 20;
        const fPage = body.page || 1;
        result = await taskadeRequest(`/folders/${body.folder_id}/agents?limit=${fLimit}&page=${fPage}`);
        break;
      }

      case "create_folder_agent":
        result = await taskadeRequest(`/folders/${body.folder_id}/agents`, "POST", {
          name: body.name,
          data: body.data || { description: body.description || "", commands: [], knowledgeEnabled: true },
        });
        await logSync(user.id, "create_agent", "agent", result.data?.item?.id || null, result.ok ? "success" : "error");
        break;

      case "generate_folder_agent":
        result = await taskadeRequest(`/folders/${body.folder_id}/agent-generate`, "POST", {
          text: body.text,
        });
        await logSync(user.id, "generate_agent", "agent", result.data?.item?.id || null, result.ok ? "success" : "error");
        break;

      case "get_folder_medias": {
        const mLimit = body.limit || 100;
        const mPage = body.page || 1;
        result = await taskadeRequest(`/folders/${body.folder_id}/medias?limit=${mLimit}&page=${mPage}`);
        break;
      }

      case "get_folder_templates": {
        const tLimit = body.limit || 20;
        const tPage = body.page || 1;
        result = await taskadeRequest(`/folders/${body.folder_id}/project-templates?limit=${tLimit}&page=${tPage}`);
        break;
      }

      // ══════════════════════════════════════════
      // ── Projects ──
      // ══════════════════════════════════════════
      case "list_projects":
        result = await taskadeRequest("/me/projects");
        break;

      case "get_my_projects":
        result = await taskadeRequest("/me/projects");
        break;

      case "create_project":
        result = await taskadeRequest(`/workspaces/${body.workspace_id}/projects`, "POST", {
          contentType: body.content_type || "text/markdown",
          content: body.content || body.title || "",
        });
        await logSync(user.id, "create_project", "project", result.data?.item?.id || null, result.ok ? "success" : "error");
        break;

      case "get_project":
        result = await taskadeRequest(`/projects/${body.project_id}`);
        break;

      case "update_project":
        result = await taskadeRequest(`/projects/${body.project_id}`, "PUT", {
          contentType: body.content_type || "text/markdown",
          content: body.content,
        });
        await logSync(user.id, "update_project", "project", body.project_id, result.ok ? "success" : "error");
        break;

      case "delete_project":
        result = await taskadeRequest(`/projects/${body.project_id}`, "DELETE");
        await logSync(user.id, "delete_project", "project", body.project_id, result.ok ? "success" : "error");
        break;

      case "complete_project":
        result = await taskadeRequest(`/projects/${body.project_id}/complete`, "POST");
        await logSync(user.id, "complete_project", "project", body.project_id, result.ok ? "success" : "error");
        break;

      case "restore_project":
        result = await taskadeRequest(`/projects/${body.project_id}/restore`, "POST");
        await logSync(user.id, "restore_project", "project", body.project_id, result.ok ? "success" : "error");
        break;

      case "copy_project":
        result = await taskadeRequest(`/projects/${body.project_id}/copy`, "POST", {
          folderId: body.folder_id,
          projectTitle: body.project_title,
        });
        await logSync(user.id, "copy_project", "project", body.project_id, result.ok ? "success" : "error");
        break;

      case "create_project_from_template":
        result = await taskadeRequest("/projects/template", "POST", {
          folderId: body.folder_id,
          templateId: body.template_id,
        });
        await logSync(user.id, "create_from_template", "project", result.data?.item?.id || null, result.ok ? "success" : "error");
        break;

      case "get_project_members": {
        const pmLimit = body.limit || 20;
        const pmPage = body.page || 1;
        result = await taskadeRequest(`/projects/${body.project_id}/members?limit=${pmLimit}&page=${pmPage}`);
        break;
      }

      case "get_project_fields":
        result = await taskadeRequest(`/projects/${body.project_id}/fields`);
        break;

      case "get_project_share_link":
        result = await taskadeRequest(`/projects/${body.project_id}/share-link`);
        break;

      case "enable_project_share_link":
        result = await taskadeRequest(`/projects/${body.project_id}/share-link`, "PUT");
        await logSync(user.id, "enable_share_link", "project", body.project_id, result.ok ? "success" : "error");
        break;

      case "get_project_blocks": {
        const bLimit = body.limit || 100;
        let bPath = `/projects/${body.project_id}/blocks?limit=${bLimit}`;
        if (body.after) bPath += `&after=${body.after}`;
        result = await taskadeRequest(bPath);
        break;
      }

      case "get_project_tasks": {
        const ptLimit = body.limit || 100;
        let ptPath = `/projects/${body.project_id}/tasks?limit=${ptLimit}`;
        if (body.after) ptPath += `&after=${body.after}`;
        result = await taskadeRequest(ptPath);
        break;
      }

      // ══════════════════════════════════════════
      // ── Tasks ──
      // ══════════════════════════════════════════
      case "list_tasks":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks`);
        break;

      case "get_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}`);
        break;

      case "create_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks`, "POST", {
          tasks: body.tasks || [{ content: body.title || body.content || "", contentType: "text/markdown" }],
        });
        await logSync(user.id, "create_task", "task", result.data?.items?.[0]?.id || null, result.ok ? "success" : "error");
        break;

      case "update_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}`, "PUT", {
          content: body.content || body.title,
          contentType: body.content_type || "text/markdown",
        });
        await logSync(user.id, "update_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "delete_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}`, "DELETE");
        await logSync(user.id, "delete_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "complete_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/complete`, "POST");
        await logSync(user.id, "complete_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "uncomplete_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/uncomplete`, "POST");
        await logSync(user.id, "uncomplete_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "move_task":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/move`, "PUT", {
          afterId: body.after_id,
          parentId: body.parent_id,
        });
        await logSync(user.id, "move_task", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "get_task_assignees":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/assignees`);
        break;

      case "update_task_assignees":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/assignees`, "PUT", {
          handles: body.handles,
        });
        await logSync(user.id, "update_task_assignees", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "remove_task_assignee":
        result = await taskadeRequest(
          `/projects/${body.project_id}/tasks/${body.task_id}/assignees/${body.handle}`,
          "DELETE",
        );
        await logSync(user.id, "remove_task_assignee", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "get_task_date":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/date`);
        break;

      case "set_task_date":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/date`, "PUT", {
          start: body.start,
          due: body.due,
        });
        await logSync(user.id, "set_task_date", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "delete_task_date":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/date`, "DELETE");
        await logSync(user.id, "delete_task_date", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "get_task_note":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/note`);
        break;

      case "update_task_note":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/note`, "PUT", {
          type: body.note_type || "text",
          value: body.value,
        });
        await logSync(user.id, "update_task_note", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "delete_task_note":
        result = await taskadeRequest(`/projects/${body.project_id}/tasks/${body.task_id}/note`, "DELETE");
        await logSync(user.id, "delete_task_note", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "get_task_field":
        result = await taskadeRequest(
          `/projects/${body.project_id}/tasks/${body.task_id}/fields/${body.field_id}`,
        );
        break;

      case "update_task_field":
        result = await taskadeRequest(
          `/projects/${body.project_id}/tasks/${body.task_id}/fields/${body.field_id}`,
          "PUT",
          { value: body.value },
        );
        await logSync(user.id, "update_task_field", "task", body.task_id, result.ok ? "success" : "error");
        break;

      case "delete_task_field":
        result = await taskadeRequest(
          `/projects/${body.project_id}/tasks/${body.task_id}/fields/${body.field_id}`,
          "DELETE",
        );
        await logSync(user.id, "delete_task_field", "task", body.task_id, result.ok ? "success" : "error");
        break;

      // ══════════════════════════════════════════
      // ── Agents ──
      // ══════════════════════════════════════════
      case "list_agents":
        result = await taskadeRequest(`/folders/${body.folder_id}/agents`);
        break;

      case "get_agent":
        result = await taskadeRequest(`/agents/${body.agent_id}`);
        break;

      case "update_agent":
        result = await taskadeRequest(`/agents/${body.agent_id}`, "PATCH", {
          name: body.name,
        });
        await logSync(user.id, "update_agent", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "delete_agent":
        result = await taskadeRequest(`/agents/${body.agent_id}`, "DELETE");
        await logSync(user.id, "delete_agent", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "enable_agent_public_access":
        result = await taskadeRequest(`/agents/${body.agent_id}/publicAccess`, "PUT");
        await logSync(user.id, "enable_public_access", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "get_public_agent":
        result = await taskadeRequest(`/agents/${body.agent_id}/public-agent`);
        break;

      case "update_public_agent":
        result = await taskadeRequest(`/agents/${body.agent_id}/public-agent`, "PATCH", body.settings || {});
        await logSync(user.id, "update_public_agent", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "add_agent_knowledge_project":
        result = await taskadeRequest(`/agents/${body.agent_id}/knowledge/project`, "POST", {
          projectId: body.project_id,
        });
        await logSync(user.id, "add_knowledge_project", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "add_agent_knowledge_media":
        result = await taskadeRequest(`/agents/${body.agent_id}/knowledge/media`, "POST", {
          mediaId: body.media_id,
        });
        await logSync(user.id, "add_knowledge_media", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "remove_agent_knowledge_project":
        result = await taskadeRequest(
          `/agents/${body.agent_id}/knowledge/project/${body.project_id}`,
          "DELETE",
        );
        await logSync(user.id, "remove_knowledge_project", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "remove_agent_knowledge_media":
        result = await taskadeRequest(
          `/agents/${body.agent_id}/knowledge/media/${body.media_id}`,
          "DELETE",
        );
        await logSync(user.id, "remove_knowledge_media", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      case "get_agent_conversations": {
        const acLimit = body.limit || 20;
        const acPage = body.page || 1;
        result = await taskadeRequest(`/agents/${body.agent_id}/convos/?limit=${acLimit}&page=${acPage}`);
        break;
      }

      case "get_agent_conversation":
        result = await taskadeRequest(`/agents/${body.agent_id}/convos/${body.conversation_id}`);
        break;

      case "prompt_agent":
        result = await taskadeRequest(`/agents/${body.agent_id}/conversations`, "POST", {
          message: body.message,
          conversation_id: body.conversation_id,
        });
        await logSync(user.id, "prompt_agent", "agent", body.agent_id, result.ok ? "success" : "error");
        break;

      // ══════════════════════════════════════════
      // ── Media ──
      // ══════════════════════════════════════════
      case "get_media":
        result = await taskadeRequest(`/medias/${body.media_id}`);
        break;

      case "delete_media":
        result = await taskadeRequest(`/medias/${body.media_id}`, "DELETE");
        await logSync(user.id, "delete_media", "media", body.media_id, result.ok ? "success" : "error");
        break;

      // ══════════════════════════════════════════
      // ── Sync logs ──
      // ══════════════════════════════════════════
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
