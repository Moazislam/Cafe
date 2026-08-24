import { LogIn } from "lucide-react";
import { useState } from "react";
import { getSupabase } from "../services/supabase";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setError("");

    try {
      const normalizedUsername = username.trim();
      const client = getSupabase();
      const { data: email, error: lookupError } = await client.rpc("login_email_for_username", {
        p_username: normalizedUsername,
      });

      if (lookupError || !email) {
        setError("Invalid username or password.");
        return;
      }

      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) setError("Invalid username or password.");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-brand"><span className="brand-mark">C</span><p>Cafe Control</p><h1>Keep every room moving.</h1></section>
      <form className="login-form" onSubmit={submit}>
        <span className="eyebrow">Staff sign in</span>
        <h2>Welcome back</h2>
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" autoCapitalize="none" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
        {error ? <p className="form-message error-text">{error}</p> : null}
        <button className="button primary-button full-button" type="submit" disabled={sending}><LogIn size={17} />{sending ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
