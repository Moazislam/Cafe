import { KeyRound, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, resetUserPassword } from "../services/users";

const blankUser = { username: "", email: "", password: "", role: "STAFF" };

export function Authentication() {
  const [user, setUser] = useState(blankUser);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const result = await listUsers();
      setUsers(result.users || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  function update(key, value) {
    setUser((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await createUser(user);
      setUser(blankUser);
      setMessage("User created successfully.");
      await loadUsers();
    } catch (saveError) {
      setError(saveError.message || "Could not create user.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(target) {
    const password = window.prompt(`New password for ${target.username}:`);
    if (password === null) return;
    if (password.length < 6) {
      setError("Passwords must be at least 6 characters.");
      return;
    }
    setMessage("");
    setError("");
    try {
      await resetUserPassword(target.id, password);
      setMessage(`Password reset for ${target.username}.`);
    } catch (resetError) {
      setError(resetError.message || "Could not reset password.");
    }
  }

  async function removeUser(target) {
    if (!window.confirm(`Delete ${target.username}'s account? This cannot be undone.`)) return;
    setMessage("");
    setError("");
    try {
      await deleteUser(target.id);
      setMessage(`User ${target.username} deleted.`);
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete user.");
    }
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">Access control</span><h1>Authentication</h1><p>Create staff accounts and manage administrator access.</p></div><ShieldCheck size={28} /></section>
    <section className="authentication-layout">
      <form className="form-surface" onSubmit={submit}>
        <div className="section-heading"><div><h2>Add user</h2><p>New accounts can sign in immediately.</p></div><UserPlus size={21} /></div>
        <label>Username<input value={user.username} onChange={(event) => update("username", event.target.value)} required autoCapitalize="none" /></label>
        <label>Email<input type="email" value={user.email} onChange={(event) => update("email", event.target.value)} required autoComplete="off" /></label>
        <label>Temporary password<input type="password" minLength="6" value={user.password} onChange={(event) => update("password", event.target.value)} required autoComplete="new-password" /></label>
        <label>Role<select value={user.role} onChange={(event) => update("role", event.target.value)}><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select></label>
        {error ? <p className="form-message error-text">{error}</p> : null}
        {message ? <p className="form-message">{message}</p> : null}
        <button className="button primary-button full-button" type="submit" disabled={saving}><UserPlus size={17} />{saving ? "Creating user..." : "Create user"}</button>
      </form>
      <section className="section-surface"><div className="section-heading"><div><h2>Users</h2><p>{users.length} account{users.length === 1 ? "" : "s"}.</p></div></div>{loading ? <p className="empty-state">Loading users...</p> : <div className="user-list">{users.map((target) => <article className="user-row" key={target.id}><div><strong>{target.username}</strong><span>{target.email}</span></div><div className="user-row-actions"><span className={`role-label role-${target.role.toLowerCase()}`}>{target.role}</span><button className="icon-button bordered" type="button" onClick={() => resetPassword(target)} title={`Reset ${target.username}'s password`} aria-label={`Reset ${target.username}'s password`}><KeyRound size={16} /></button><button className="icon-button bordered inventory-delete-button" type="button" onClick={() => removeUser(target)} title={`Delete ${target.username}`} aria-label={`Delete ${target.username}`}><Trash2 size={16} /></button></div></article>)}</div>}</section>
    </section>
  </div>;
}
