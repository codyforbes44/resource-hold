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

    // Verify the user's JWT and check admin role
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role using service role client
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

    // Handle POST actions (role management)
    if (req.method === "POST") {
      const body = await req.json();
      const { action, user_id, role } = body;

      if (action === "assign_role") {
        const { error } = await adminClient
          .from("user_roles")
          .upsert({ user_id, role }, { onConflict: "user_id,role" });
        if (error) throw error;

        // Audit log
        await adminClient.from("audit_logs").insert({
          actor_id: user.id,
          action: "assign_role",
          target_type: "user",
          target_id: user_id,
          metadata: { role },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "revoke_role") {
        const { error } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", role);
        if (error) throw error;

        await adminClient.from("audit_logs").insert({
          actor_id: user.id,
          action: "revoke_role",
          target_type: "user",
          target_id: user_id,
          metadata: { role },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unknown action: ${action}`);
    }

    // GET: Fetch admin dashboard data
    const [profilesRes, conversationsRes, auditRes, userCountRes, convCountRes, msgCountRes] =
      await Promise.all([
        adminClient.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
        adminClient.from("conversations").select("*, messages(count)").order("updated_at", { ascending: false }).limit(100),
        adminClient.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
        adminClient.from("profiles").select("*", { count: "exact", head: true }),
        adminClient.from("conversations").select("*", { count: "exact", head: true }),
        adminClient.from("messages").select("*", { count: "exact", head: true }),
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
