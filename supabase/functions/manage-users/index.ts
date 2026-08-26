import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminClient = createClient(supabaseUrl, serviceRoleKey);
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Not authenticated.");
  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Not authenticated.");
  const { data: profile, error: profileError } = await adminClient.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (profileError || profile?.role !== "ADMIN") throw new Error("Admin access required.");
  return userData.user;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const adminUser = await requireAdmin(request);
    const body = await request.json();
    const action = clean(body.action);

    if (action === "list") {
      const { data: profiles, error } = await adminClient.from("profiles").select("id, username, role, full_name, created_at").order("created_at", { ascending: true });
      if (error) throw error;
      const users = await Promise.all((profiles || []).map(async (profile) => {
        const { data } = await adminClient.auth.admin.getUserById(profile.id);
        return { ...profile, email: data.user?.email || "" };
      }));
      return response({ users });
    }

    if (action === "create") {
      const username = clean(body.username).toLowerCase();
      const email = clean(body.email).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      const role = clean(body.role).toUpperCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error("Username must be 3-40 characters and use letters, numbers, dots, underscores, or hyphens.");
      if (!email || !password || password.length < 6 || !["ADMIN", "STAFF"].includes(role)) throw new Error("Enter a valid email, a password of at least 6 characters, and a valid role.");
      const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
      if (error || !data.user) throw error || new Error("Could not create user.");
      const { error: profileError } = await adminClient.from("profiles").update({ username, role }).eq("id", data.user.id);
      if (profileError) {
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
      return response({ user: { id: data.user.id, username, email, role } }, 201);
    }

    if (action === "reset_password") {
      const userId = clean(body.userId);
      const password = typeof body.password === "string" ? body.password : "";
      if (!userId || password.length < 6) throw new Error("Password must be at least 6 characters.");
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return response({ success: true });
    }

    if (action === "delete") {
      const userId = clean(body.userId);
      if (!userId) throw new Error("User ID is required.");
      if (userId === adminUser.id) throw new Error("You cannot delete your own account.");
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return response({ success: true });
    }

    throw new Error("Unknown user management action.");
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Request failed." }, 400);
  }
});
