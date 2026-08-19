import { useEffect, useRef, useState } from "react";
import { playAlarm, unlockAudio } from "../audio";

const CHECK_INTERVAL_MS = 15000;

export function useOvertimeAlerts(activeSessions) {
  const [overtimeSessionIds, setOvertimeSessionIds] = useState(() => new Set());
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    document.addEventListener("click", unlockAudio, { once: true });
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    function check() {
      const now = Date.now();
      const overtime = new Set();

      activeSessions.forEach((session) => {
        if (!session.expected_end_time) return;
        if (new Date(session.expected_end_time).getTime() > now) return;

        overtime.add(session.id);
        if (!notifiedRef.current.has(session.id)) {
          notifiedRef.current.add(session.id);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Session time is up", {
              body: `${session.rooms?.name || "A room"}'s booked time has ended.`,
            });
          }
        }
      });

      const activeIds = new Set(activeSessions.map((session) => session.id));
      notifiedRef.current.forEach((id) => {
        if (!activeIds.has(id)) notifiedRef.current.delete(id);
      });

      if (overtime.size) playAlarm();
      setOvertimeSessionIds(overtime);
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeSessions]);

  return overtimeSessionIds;
}
