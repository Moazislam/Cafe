import { DollarSign, KeyRound, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, resetUserPassword } from "../services/users";
import { fetchRooms, updateRoomPricing } from "../services/rooms";

const blankUser = { username: "", email: "", password: "", role: "STAFF" };

export function Authentication() {
  const [user, setUser] = useState(blankUser);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingSaving, setPricingSaving] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [userResult, roomResult] = await Promise.all([listUsers(), fetchRooms()]);
      setUsers(userResult.users || []);
      setRooms(roomResult);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

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
      await loadData();
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
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete user.");
    }
  }

  async function saveRoomPricing(room) {
      const hourlyRate = Number(room.hourly_rate);
      const multiplayerHourlyRate = Number(room.multiplayer_hourly_rate);
      if (!Number.isFinite(hourlyRate) || hourlyRate < 0 || !Number.isFinite(multiplayerHourlyRate) || multiplayerHourlyRate < 0) {
        setError("Room rates must be valid non-negative numbers.");
        return;
      }

      setPricingSaving(room.id);
      setMessage("");
      setError("");
      try {
        const updatedRoom = await updateRoomPricing({
          roomId: room.id,
          hourlyRate,
          multiplayerHourlyRate,
        });
        setRooms((current) => current.map((item) => item.id === updatedRoom.id ? updatedRoom : item));
        setMessage(`${room.name} pricing updated.`);
      } catch (saveError) {
        setError(saveError.message || "Could not update room pricing.");
      } finally {
        setPricingSaving("");
      }
    }

  function updateRoomRate(roomId, key, value) {
    setRooms((current) => current.map((room) => room.id === roomId ? { ...room, [key]: value } : room));
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
    <section className="section-surface pricing-surface">
      <div className="section-heading">
        <div><h2>Room time pricing</h2><p>Set the hourly rate for single-player and multiplayer sessions. Changes apply to new revenue and the room screen immediately.</p></div>
        <DollarSign size={21} />
      </div>
      {rooms.length ? <div className="pricing-list">{rooms.map((room) => (
        <form className="pricing-row" key={room.id} onSubmit={(event) => { event.preventDefault(); saveRoomPricing(room); }}>
          <div className="pricing-room"><strong>{room.name}</strong><span>{room.console_type || "Gaming station"}</span></div>
          <label>Single / hour<input type="number" min="0" step="0.01" value={room.hourly_rate ?? 0} onChange={(event) => updateRoomRate(room.id, "hourly_rate", event.target.value)} /></label>
          <label>Multiplayer / hour<input type="number" min="0" step="0.01" value={room.multiplayer_hourly_rate ?? Number(room.hourly_rate || 0) + 10} onChange={(event) => updateRoomRate(room.id, "multiplayer_hourly_rate", event.target.value)} /></label>
          <button className="button primary-button" type="submit" disabled={pricingSaving === room.id}>{pricingSaving === room.id ? "Saving..." : "Save rate"}</button>
        </form>
      ))}</div> : <p className="empty-state">No rooms have been added yet.</p>}
    </section>
  </div>;
}
