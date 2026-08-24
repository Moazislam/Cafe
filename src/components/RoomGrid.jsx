import { RoomCard } from "./RoomCard";

export function RoomGrid(props) {
  if (!props.rooms.length) return <div className="empty-state">No rooms have been added yet.</div>;

  return (
    <div className="room-grid">
      {props.rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          roomMode={props.roomModes?.[room.id] ?? "SINGLE"}
          onModeChange={props.onModeChange}
          {...props}
        />
      ))}
    </div>
  );
}
