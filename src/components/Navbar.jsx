import { Boxes, CalendarDays, Coins, Crown, LayoutDashboard, LogOut, Package, ReceiptText } from "lucide-react";
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
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "Staff";
  const normalizedRole = String(role || "").toUpperCase();
  const isAdmin = normalizedRole === "ADMIN";
  const canAccessVip = isAdmin || normalizedRole === "STAFF";

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <header className="topbar">
      <NavLink to="/dashboard" className="brand" aria-label="Cafe Control home">
        <span className="brand-mark">C</span>
        <span>Cafe Control</span>
      </NavLink>
      <nav className="primary-nav" aria-label="Main navigation">
        {[...links, ...(isAdmin ? [{ to: "/inventory", label: "Inventory", icon: Package }] : []), ...(canAccessVip ? [{ to: "/vip", label: "VIP", icon: Crown }] : [])].map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="account-area">
        <span className="user-email">{username}</span>
        <button className="icon-button" type="button" onClick={signOut} title="Sign out" aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
