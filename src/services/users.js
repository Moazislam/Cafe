import { getSupabase } from "./supabase";

async function callUserFunction(payload) {
  const client = getSupabase();
  const { data, error } = await client.functions.invoke("manage-users", { body: payload });
  if (error) {
    let serverMessage = "";
    try {
      const details = await error.context?.json();
      serverMessage = details?.error || "";
    } catch {
      // The response may not contain JSON.
    }
    throw new Error(serverMessage || error.message || "User management request failed.");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function listUsers() {
  return callUserFunction({ action: "list" });
}

export function createUser(user) {
  return callUserFunction({ action: "create", ...user });
}

export function resetUserPassword(userId, password) {
  return callUserFunction({ action: "reset_password", userId, password });
}

export function deleteUser(userId) {
  return callUserFunction({ action: "delete", userId });
}
