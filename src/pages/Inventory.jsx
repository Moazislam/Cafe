import { PackagePlus } from "lucide-react";
import { useState } from "react";
import { InventoryTable } from "../components/InventoryTable";
import { useOutletContext } from "react-router-dom";
import { upsertInventoryItem } from "../services/inventory";

const blankItem = { name: "", category: "", quantity: 0, price: 0, lowStockThreshold: 5 };

export function Inventory() {
  const cafe = useOutletContext();
  const [item, setItem] = useState(blankItem);
  const [message, setMessage] = useState("");
  function update(key, value) { setItem((current) => ({ ...current, [key]: value })); }
  function edit(source) { setItem({ id: source.id, name: source.name, category: source.category || "", quantity: source.quantity, price: source.price, lowStockThreshold: source.low_stock_threshold }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function submit(event) { event.preventDefault(); setMessage(""); try { await upsertInventoryItem(item); setMessage(item.id ? "Item updated." : "Item added."); setItem(blankItem); await cafe.refresh(); } catch (error) { setMessage(error.message || "Could not save this item."); } }

  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">Counter stock</span><h1>Inventory</h1><p>Track items and surface low stock before the counter runs dry.</p></div></section><section className="inventory-layout"><form className="form-surface" onSubmit={submit}><div className="section-heading"><div><h2>{item.id ? "Edit item" : "Add item"}</h2><p>Stock cannot fall below zero.</p></div><PackagePlus size={21} /></div><label>Item name<input value={item.name} onChange={(event) => update("name", event.target.value)} required /></label><label>Category<input value={item.category} onChange={(event) => update("category", event.target.value)} placeholder="Drinks, snacks..." /></label><div className="two-fields"><label>Quantity<input type="number" min="0" value={item.quantity} onChange={(event) => update("quantity", event.target.value)} required /></label><label>Low stock at<input type="number" min="0" value={item.lowStockThreshold} onChange={(event) => update("lowStockThreshold", event.target.value)} required /></label></div><label>Price (EGP)<input type="number" min="0" step="0.01" value={item.price} onChange={(event) => update("price", event.target.value)} required /></label><button className="button primary-button full-button" type="submit"><PackagePlus size={17} />{item.id ? "Save item" : "Add item"}</button>{item.id ? <button className="text-action centered" type="button" onClick={() => setItem(blankItem)}>Create new item</button> : null}{message ? <p className="form-message">{message}</p> : null}</form><section className="section-surface"><div className="section-heading"><div><h2>Stock list</h2><p>{cafe.lowStock.length} items need attention.</p></div></div><InventoryTable items={cafe.inventory} onEdit={edit} /></section></section></div>;
}
