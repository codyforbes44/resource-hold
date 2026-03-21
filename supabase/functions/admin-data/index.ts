import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden — admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle POST actions
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "assign_role") {
        const { user_id, role } = body;
        const { error } = await adminClient.from("user_roles").upsert({ user_id, role }, { onConflict: "user_id,role" });
        if (error) throw error;
        await adminClient.from("audit_logs").insert({ actor_id: user.id, action: "assign_role", target_type: "user", target_id: user_id, metadata: { role } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "revoke_role") {
        const { user_id, role } = body;
        const { error } = await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
        if (error) throw error;
        await adminClient.from("audit_logs").insert({ actor_id: user.id, action: "revoke_role", target_type: "user", target_id: user_id, metadata: { role } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "set_model_default") {
        const { model, enabled, visitor_enabled } = body;
        const update: Record<string, any> = {};
        if (typeof enabled === "boolean") update.enabled = enabled;
        if (typeof visitor_enabled === "boolean") update.visitor_enabled = visitor_enabled;
        const { error } = await adminClient.from("model_access_defaults").update(update).eq("model", model);
        if (error) throw error;
        await adminClient.from("audit_logs").insert({ actor_id: user.id, action: "set_model_default", target_type: "model", target_id: model, metadata: update });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "set_user_model_override") {
        const { user_id, model, enabled } = body;
        if (enabled === null) {
          await adminClient.from("user_model_overrides").delete().eq("user_id", user_id).eq("model", model);
        } else {
          await adminClient.from("user_model_overrides").upsert({ user_id, model, enabled }, { onConflict: "user_id,model" });
        }
        await adminClient.from("audit_logs").insert({ actor_id: user.id, action: "set_user_model_override", target_type: "user_model", target_id: `${user_id}:${model}`, metadata: { enabled } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Knowledge Base actions
      if (action === "delete_kb_doc") {
        const { doc_id } = body;
        await adminClient.from("knowledge_chunks").delete().eq("document_id", doc_id);
        await adminClient.from("knowledge_documents").delete().eq("id", doc_id);
        await adminClient.from("audit_logs").insert({ actor_id: user.id, action: "delete_kb_doc", target_type: "knowledge_document", target_id: doc_id });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "add_kb_url") {
        const { url } = body;
        // Call the knowledge-batch-ingest function
        const resp = await fetch(`${supabaseUrl}/functions/v1/knowledge-batch-ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ urls: [url] }),
        });
        if (!resp.ok) { const err = await resp.text(); throw new Error(err); }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "trigger_kb_refresh") {
        const resp = await fetch(`${supabaseUrl}/functions/v1/knowledge-refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        });
        if (!resp.ok) { const err = await resp.text(); throw new Error(err); }
        await adminClient.from("audit_logs").insert({ actor_id: user.id, action: "trigger_kb_refresh", target_type: "knowledge_base" });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "bulk_cleanup_kb") {
        // Delete stuck "processing" docs older than 30 minutes
        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: stuckDocs } = await adminClient.from("knowledge_documents").select("id").eq("status", "processing").lt("updated_at", cutoff);
        if (stuckDocs && stuckDocs.length > 0) {
          const ids = stuckDocs.map((d: any) => d.id);
          await adminClient.from("knowledge_chunks").delete().in("document_id", ids);
          await adminClient.from("knowledge_documents").delete().in("id", ids);
        }
        await adminClient.from("audit_logs").insert({ actor_id: user.id, action: "bulk_cleanup_kb", target_type: "knowledge_base", metadata: { deleted: stuckDocs?.length || 0 } });
        return new Response(JSON.stringify({ success: true, deleted: stuckDocs?.length || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      throw new Error(`Unknown action: ${action}`);
    }

    // GET: Fetch admin dashboard data
    const [profilesRes, conversationsRes, auditRes, userCountRes, convCountRes, msgCountRes, modelDefaultsRes, userOverridesRes, kbDocsRes, kbChunkCountRes, kbPendingRes, kbErrorRes] =
      await Promise.all([
        adminClient.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
        adminClient.from("conversations").select("*, messages(count)").order("updated_at", { ascending: false }).limit(100),
        adminClient.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
        adminClient.from("profiles").select("*", { count: "exact", head: true }),
        adminClient.from("conversations").select("*", { count: "exact", head: true }),
        adminClient.from("messages").select("*", { count: "exact", head: true }),
        adminClient.from("model_access_defaults").select("*").order("model"),
        adminClient.from("user_model_overrides").select("*"),
        adminClient.from("knowledge_documents").select("*").order("updated_at", { ascending: false }).limit(500),
        adminClient.from("knowledge_chunks").select("*", { count: "exact", head: true }),
        adminClient.from("knowledge_documents").select("*", { count: "exact", head: true }).eq("status", "processing"),
        adminClient.from("knowledge_documents").select("*", { count: "exact", head: true }).eq("status", "error"),
      ]);

    const conversations = (conversationsRes.data || []).map((c: any) => ({
      ...c,
      message_count: c.messages?.[0]?.count || 0,
      messages: undefined,
    }));

    return new Response(
      JSON.stringify({
        profiles: profilesRes.data || [],
        conversations,
        auditLogs: auditRes.data || [],
        stats: {
          totalUsers: userCountRes.count || 0,
          totalConversations: convCountRes.count || 0,
          totalMessages: msgCountRes.count || 0,
        },
        modelDefaults: modelDefaultsRes.data || [],
        userModelOverrides: userOverridesRes.data || [],
        kbDocuments: kbDocsRes.data || [],
        kbStats: {
          totalDocs: (kbDocsRes.data || []).length,
          totalChunks: kbChunkCountRes.count || 0,
          pendingDocs: kbPendingRes.count || 0,
          errorDocs: kbErrorRes.count || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("admin-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
