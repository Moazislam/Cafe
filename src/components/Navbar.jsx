import { Boxes, CalendarDays, Coins, Crown, KeyRound, LayoutDashboard, LogOut, Package, ReceiptText, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

const links = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/rooms", label: "Rooms", icon: Boxes },
  { to: "/reservations", label: "Reservations", icon: CalendarDays },
  { to: "/orders", label: "Orders", icon: ReceiptText },
  { to: "/reports", label: "Reports", icon: Coins },
];

export function Navbar({ user, role }) {
  const navigate = useNavigate();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "Staff";
  const normalizedRole = String(role || "").toUpperCase();
  const isAdmin = normalizedRole === "ADMIN";
  const canAccessVip = isAdmin || normalizedRole === "STAFF";

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setPasswordError(error.message || "Could not change password.");
    else { setPassword(""); setPasswordMessage("Password changed."); }
  }

  return (
    <header className="topbar">
      <NavLink to="/dashboard" className="brand" aria-label="Cafe Control home">
        <span className="brand-mark">C</span>
        <span>Cafe Control</span>
      </NavLink>
      <nav className="primary-nav" aria-label="Main navigation">
        {[...links, ...(isAdmin ? [{ to: "/inventory", label: "Inventory", icon: Package }, { to: "/authentication", label: "Authentication", icon: ShieldCheck }] : []), ...(canAccessVip ? [{ to: "/vip", label: "VIP", icon: Crown }] : [])].map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="account-area">
        <button className="account-name" type="button" onClick={() => { setShowPasswordForm(true); setPasswordMessage(""); setPasswordError(""); }} title="Change password">{username}</button>
        <button className="icon-button" type="button" onClick={signOut} title="Sign out" aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </div>
      {showPasswordForm ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPasswordForm(false); }}><form className="modal-panel" onSubmit={changePassword} role="dialog" aria-modal="true" aria-labelledby="change-password-title"><div className="modal-header"><div><span className="eyebrow">Account security</span><h2 id="change-password-title">Change password</h2></div><button className="icon-button" type="button" onClick={() => setShowPasswordForm(false)} title="Close" aria-label="Close"><X size={18} /></button></div><label>New password<input type="password" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" /></label>{passwordError ? <p className="form-message error-text">{passwordError}</p> : null}{passwordMessage ? <p className="form-message">{passwordMessage}</p> : null}<button className="button primary-button full-button" type="submit"><KeyRound size={17} />Change password</button></form></div> : null}
    </header>
  );
}
