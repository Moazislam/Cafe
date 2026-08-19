import { AlertTriangle, Pencil } from "lucide-react";
import { currency } from "../utils";

export function InventoryTable({ items, onEdit }) {
  if (!items.length) return <div className="empty-state">No inventory items yet.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Item</th><th>Category</th><th>In stock</th><th>Price</th><th aria-label="Actions" /></tr></thead>
        <tbody>
          {items.map((item) => {
            const low = item.quantity <= item.low_stock_threshold;
            return (
              <tr key={item.id}>
                <td><strong>{item.name}</strong></td>
                <td>{item.category || "Other"}</td>
                <td className={low ? "low-stock" : ""}>{low ? <AlertTriangle size={15} /> : null}{item.quantity}</td>
                <td>{currency(item.price)}</td>
                <td><button className="icon-button bordered" type="button" title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}><Pencil size={16} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
