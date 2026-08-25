import { BellRing, Clock3, Play, X } from "lucide-react";

const MODES = [
  { value: "OPEN", label: "Open", description: "No automatic alarm" },
  { value: "1_HOUR", label: "1 hour", description: "Alarm after 1 hour" },
  { value: "2_HOURS", label: "2 hours", description: "Alarm after 2 hours" },
];

export function SessionModeDialog({ room, mode, onChange, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="modal-panel session-mode-panel" role="dialog" aria-modal="true" aria-labelledby="session-mode-title">
        <div className="modal-header">
          <div><span className="eyebrow">Start session</span><h2 id="session-mode-title">{room?.name || "Room"}</h2></div>
          <button className="icon-button bordered" type="button" title="Close" aria-label="Close" onClick={onCancel}><X size={17} /></button>
        </div>
        <div className="session-mode-options">
          {MODES.map((item) => (
            <label className={`session-mode-option${mode === item.value ? " selected" : ""}`} key={item.value}>
              <input type="radio" name="session-mode" value={item.value} checked={mode === item.value} onChange={() => onChange(item.value)} />
              <span className="session-mode-icon">{item.value === "OPEN" ? <Play size={17} /> : item.value === "1_HOUR" ? <Clock3 size={17} /> : <BellRing size={17} />}</span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </label>
          ))}
        </div>
        <div className="checkout-actions">
          <button className="button secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="button primary-button" type="button" onClick={onConfirm}><Play size={16} fill="currentColor" />Start session</button>
        </div>
      </section>
    </div>
  );
}
