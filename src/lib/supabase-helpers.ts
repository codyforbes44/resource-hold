import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current user's access token for authenticated edge function calls.
 */
export async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return session.access_token;
}

/**
 * Call an edge function with the user's session token.
 */
export async function callEdgeFunction(
  functionName: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {}
): Promise<Response> {
  const token = await getAccessToken();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  
  return fetch(url, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}
