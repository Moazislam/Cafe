import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { BellRing } from "lucide-react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Login } from "./pages/Login";
import { Orders } from "./pages/Orders";
import { Reports } from "./pages/Reports";
import { Reservations } from "./pages/Reservations";
import { Rooms } from "./pages/Rooms";
import { hasSupabaseConfig, supabase } from "./services/supabase";
import { useCafeData } from "./hooks/useCafeData";
import { useOvertimeAlerts } from "./hooks/useOvertimeAlerts";

function SetupRequired() {
  return (
    <main className="setup-screen">
      <section className="setup-panel">
        <span className="eyebrow">Cafe operations</span>
        <h1>Connect Supabase to begin.</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env</code>, then add your project URL and anon key.
        </p>
      </section>
    </main>
  );
}

function ProtectedLayout({ session }) {
  const cafe = useCafeData();
  const overtimeSessionIds = useOvertimeAlerts(cafe.activeSessions);
  const overtimeSessions = cafe.activeSessions.filter((item) => overtimeSessionIds.has(item.id));

  if (cafe.loading) {
    return <main className="loading-screen">Loading cafe operations...</main>;
  }

  return (
    <div className="app-shell">
      <Navbar user={session.user} />
      <main className="content-shell">
        {cafe.error ? <div className="error-banner">{cafe.error}</div> : null}
        {overtimeSessions.length ? (
          <div className="alarm-banner" role="alert">
            <BellRing size={18} />
            <span>
              {overtimeSessions.map((item) => item.rooms?.name || "A room").join(", ")}{" "}
              {overtimeSessions.length === 1 ? "is" : "are"} past the booked time.
            </span>
          </div>
        ) : null}
        <Outlet context={{ ...cafe, overtimeSessionIds }} />
      </main>
    </div>
  );
}

function AppRoutes() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setChecking(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (checking) return <main className="loading-screen">Checking secure access...</main>;
  if (!session && location.pathname !== "/login") return <Navigate to="/login" replace />;
  if (session && location.pathname === "/login") return <Navigate to="/dashboard" replace />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout session={session} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return hasSupabaseConfig ? <AppRoutes /> : <SetupRequired />;
}
