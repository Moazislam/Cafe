import { Check, Crown, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { adjustVipInventory, createVipPurchase, fetchVipPurchases, setVipPurchaseItemPaid } from "../services/vip";
import { currency, dateTime } from "../utils";
import "./vip.css";

const blankPurchase = { customerName: "" };

function purchaseItems(purchase) {
  if (purchase.vip_purchase_items?.length) return purchase.vip_purchase_items;
  return [{ id: `legacy-${purchase.id}`, item_name: purchase.items, quantity: 1, unit_price: purchase.amount, paid: purchase.paid, legacy: true }];
}

export function VIP() {
  const cafe = useOutletContext();
  const [purchases, setPurchases] = useState([]);
  const [purchase, setPurchase] = useState(blankPurchase);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const nextPurchases = await fetchVipPurchases();
      setPurchases(nextPurchases);
      setSelectedCustomer((current) => current ? Object.values(nextPurchases.reduce((result, record) => {
        const customer = result[record.customer_name] || { name: record.customer_name, items: [] };
        customer.items.push(...purchaseItems(record).map((item) => ({ ...item, purchaseId: record.id, addedAt: record.created_at })));
        result[record.customer_name] = customer;
        return result;
      }, {})).find((customer) => customer.name === current.name) || null : null);
    }
    catch (error) { setMessage(error.message || "Could not load VIP records."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const customers = useMemo(() => purchases.reduce((result, record) => {
    const items = purchaseItems(record);
    const customer = result[record.customer_name] || { name: record.customer_name, items: [], latest: record.created_at };
    customer.items.push(...items.map((item) => ({ ...item, purchaseId: record.id, addedAt: record.created_at })));
    result[record.customer_name] = customer;
    return result;
  }, {}), [purchases]);

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  function update(key, value) { setPurchase((current) => ({ ...current, [key]: value })); }
  async function addItem() {
    const item = cafe.inventory.find((entry) => entry.id === selectedItemId);
    if (!item) return;
    const quantity = Math.min(item.quantity, Math.max(1, Number(selectedQuantity) || 1));
    setMessage("");
    try {
      await adjustVipInventory(item.id, -quantity);
      setCart((current) => {
        const existing = current.find((entry) => entry.id === item.id);
        if (existing) return current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + quantity } : entry);
        return [...current, { ...item, quantity }];
      });
      await cafe.refresh();
      setSelectedItemId(""); setSelectedQuantity(1);
    } catch (error) { setMessage(error.message || "Could not reserve this item."); }
  }
  async function undoItem(item) {
    setMessage("");
    try {
      await adjustVipInventory(item.id, item.quantity);
      setCart((current) => current.filter((entry) => entry.id !== item.id));
      await cafe.refresh();
    } catch (error) { setMessage(error.message || "Could not restore this item."); }
  }
  async function submit(event) {
    event.preventDefault(); setMessage("");
    if (!cart.length) { setMessage("Select at least one stock item."); return; }
    try {
      await createVipPurchase({ customerName: purchase.customerName, items: cart.map((item) => `${item.quantity}x ${item.name}`).join(", "), amount: total, purchaseItems: cart });
      setPurchase(blankPurchase); setCart([]); setMessage("VIP purchase added."); await load();
    } catch (error) {
      await Promise.all(cart.map((item) => adjustVipInventory(item.id, item.quantity).catch(() => null)));
      await cafe.refresh();
      setMessage(error.message || "Could not add VIP purchase.");
    }
  }
  async function toggleItem(item) {
    if (item.legacy) { setMessage("This older purchase must be paid as a whole record."); return; }
    try { await setVipPurchaseItemPaid(item.id, !item.paid); await load(); }
    catch (error) { setMessage(error.message || "Could not update payment."); }
  }

  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">Admin ledger</span><h1>VIP customers</h1><p>Open a customer to review each purchase and mark individual items as paid.</p></div></section><section className="vip-layout"><form className="form-surface" onSubmit={submit}><div className="section-heading"><div><h2>New purchase</h2><p>Choose items from inventory; prices are automatic.</p></div><Crown size={21} /></div><label>Customer name<input value={purchase.customerName} onChange={(event) => update("customerName", event.target.value)} required /></label><div className="field-group"><label htmlFor="vip-item">Stock item</label><div className="two-fields"><select id="vip-item" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}><option value="">Choose an item</option>{cafe.inventory.map((item) => <option key={item.id} value={item.id} disabled={item.quantity === 0}>{item.name} · {currency(item.price)} · {item.quantity} left</option>)}</select><input type="number" min="1" value={selectedQuantity} onChange={(event) => setSelectedQuantity(event.target.value)} aria-label="Item quantity" /></div><button className="button secondary-button" type="button" onClick={addItem} disabled={!selectedItemId}><Plus size={16} />Add item</button></div>{cart.length ? <div className="checkout-lines">{cart.map((item) => <div className="checkout-line" key={item.id}><span>{item.quantity}x {item.name}</span><span><strong>{currency(item.price * item.quantity)}</strong><button className="text-action" type="button" onClick={() => undoItem(item)}>Undo</button></span></div>)}<div className="checkout-total"><span>Total</span><strong>{currency(total)}</strong></div></div> : <div className="empty-state">No items selected.</div>}<button className="button primary-button full-button" type="submit" disabled={!cart.length}><Plus size={17} />Add purchase</button>{message ? <p className="form-message">{message}</p> : null}</form><section className="section-surface"><div className="section-heading"><div><h2>Outstanding balance</h2><p>Paid items are zero; unpaid items are negative.</p></div></div><div className="attention-list">{Object.values(customers).length ? Object.values(customers).map((customer) => <div className="attention-item" key={customer.name}><span>{customer.name}</span><strong>{currency(customer.items.reduce((sum, item) => sum + (item.paid ? 0 : -Number(item.unit_price) * item.quantity), 0))}</strong></div>) : <div className="empty-state">No VIP purchases yet.</div>}</div></section></section><section className="section-surface"><div className="section-heading"><div><h2>Purchase history</h2><p>{Object.values(customers).length} VIP customers. Select a name to see purchased items.</p></div></div>{loading ? <div className="empty-state">Loading VIP records...</div> : <div className="vip-customer-list">{Object.values(customers).length ? Object.values(customers).map((customer) => <button className="vip-customer-toggle" type="button" key={customer.name} onClick={() => setSelectedCustomer(customer)}><strong>{customer.name}</strong><span>{customer.items.length} item{customer.items.length === 1 ? "" : "s"}</span></button>) : <div className="empty-state">No VIP purchases yet.</div>}</div>}</section>{selectedCustomer ? <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Purchase history for ${selectedCustomer.name}`}><section className="modal-panel"><div className="modal-header"><div><span className="eyebrow">VIP purchase history</span><h2>{selectedCustomer.name}</h2></div><button className="icon-button bordered" type="button" onClick={() => setSelectedCustomer(null)} title="Close" aria-label="Close"><X size={18} /></button></div><div className="vip-customer-items">{selectedCustomer.items.map((item) => <div className="vip-item-row" key={item.id}><div><strong>{item.quantity}x {item.item_name}</strong><span>{dateTime(item.addedAt)}</span></div><span>{currency(Number(item.unit_price) * item.quantity)}</span><button className={`button ${item.paid ? "secondary-button" : "primary-button"}`} type="button" onClick={() => toggleItem(item)} disabled={item.legacy}><Check size={15} />{item.paid ? "Paid" : "Mark paid"}</button></div>)}</div></section></div> : null}</div>;
}
