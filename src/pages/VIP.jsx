import { Check, Crown, Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { adjustVipInventory, createVipPurchase, deleteVipCustomer, fetchVipPurchases, setVipPurchaseItemPaid } from "../services/vip";
import { currency, dateTime } from "../utils";
import "./vip.css";

const blankPurchase = { customerName: "" };

function purchaseItems(purchase) {
  if (purchase.vip_purchase_items?.length) return purchase.vip_purchase_items;
  return [{ id: `legacy-${purchase.id}`, item_name: purchase.items, quantity: 1, unit_price: purchase.amount, paid: purchase.paid, legacy: true }];
}

function customerBalance(customer) {
  return customer.items.reduce((sum, item) => sum + (item.paid ? 0 : -Number(item.unit_price) * item.quantity), 0);
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
  const [deletingCustomer, setDeletingCustomer] = useState("");

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
  function changeSelectedQuantity(delta) {
    const item = cafe.inventory.find((entry) => entry.id === selectedItemId);
    const maximum = item?.quantity || 1;
    setSelectedQuantity((current) => Math.min(maximum, Math.max(1, Number(current) + delta)));
  }
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
  async function removeCustomer(customer) {
    if (customerBalance(customer) !== 0 || !window.confirm(`Delete all VIP records for ${customer.name}?`)) return;
    setDeletingCustomer(customer.name); setMessage("");
    try {
      await deleteVipCustomer(customer.name);
      if (selectedCustomer?.name === customer.name) setSelectedCustomer(null);
      setMessage("VIP customer deleted.");
      await load();
    } catch (error) { setMessage(error.message || "Could not delete VIP customer."); }
    finally { setDeletingCustomer(""); }
  }
  function addMoreItems(customer) {
    setPurchase({ customerName: customer.name });
    setCart([]);
    setSelectedCustomer(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">Admin ledger</span><h1>VIP customers</h1><p>Open a customer to review each purchase and mark individual items as paid.</p></div></section><section className="vip-layout"><form className="form-surface" onSubmit={submit}><div className="section-heading"><div><h2>New purchase</h2><p>Choose items from inventory; prices are automatic.</p></div><Crown size={21} /></div><label>Customer name<input value={purchase.customerName} onChange={(event) => update("customerName", event.target.value)} required /></label><div className="field-group"><label htmlFor="vip-item">Stock item</label><div className="two-fields"><select id="vip-item" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}><option value="">Choose an item</option>{cafe.inventory.map((item) => <option key={item.id} value={item.id} disabled={item.quantity === 0}>{item.name} · {currency(item.price)} · {item.quantity} left</option>)}</select><div className="quantity-bar"><button type="button" className="icon-button bordered" onClick={() => changeSelectedQuantity(-1)} disabled={!selectedItemId || Number(selectedQuantity) <= 1} title="Decrease quantity" aria-label="Decrease quantity"><Minus size={14} /></button><output>{selectedQuantity}</output><button type="button" className="icon-button bordered" onClick={() => changeSelectedQuantity(1)} disabled={!selectedItemId || Number(selectedQuantity) >= (cafe.inventory.find((item) => item.id === selectedItemId)?.quantity || 1)} title="Increase quantity" aria-label="Increase quantity"><Plus size={14} /></button></div></div><button className="button secondary-button" type="button" onClick={addItem} disabled={!selectedItemId}><Plus size={16} />Add item</button></div>{cart.length ? <div className="checkout-lines">{cart.map((item) => <div className="checkout-line" key={item.id}><span>{item.quantity}x {item.name}</span><span><strong>{currency(item.price * item.quantity)}</strong><button className="text-action" type="button" onClick={() => undoItem(item)}>Undo</button></span></div>)}<div className="checkout-total"><span>Total</span><strong>{currency(total)}</strong></div></div> : <div className="empty-state">No items selected.</div>}<button className="button primary-button full-button" type="submit" disabled={!cart.length}><Plus size={17} />Add purchase</button>{message ? <p className="form-message">{message}</p> : null}</form><section className="section-surface"><div className="section-heading"><div><h2>Outstanding balance</h2><p>Paid items are zero; unpaid items are negative.</p></div></div><div className="attention-list">{Object.values(customers).length ? Object.values(customers).map((customer) => <div className="attention-item" key={customer.name}><span>{customer.name}</span><strong>{currency(customerBalance(customer))}</strong></div>) : <div className="empty-state">No VIP purchases yet.</div>}</div></section></section><section className="section-surface"><div className="section-heading"><div><h2>Purchase history</h2><p>{Object.values(customers).length} VIP customers. Select a name to see purchased items.</p></div></div>{loading ? <div className="empty-state">Loading VIP records...</div> : <div className="vip-customer-list">{Object.values(customers).length ? Object.values(customers).map((customer) => <div className="vip-customer-row" key={customer.name}><button className="vip-customer-toggle" type="button" onClick={() => setSelectedCustomer(customer)}><strong>{customer.name}</strong><span>{customer.items.length} item{customer.items.length === 1 ? "" : "s"}</span></button>{customerBalance(customer) === 0 ? <button className="vip-delete-button" type="button" onClick={() => removeCustomer(customer)} disabled={deletingCustomer === customer.name} title="Delete customer" aria-label={`Delete ${customer.name}`}><Trash2 size={16} /></button> : null}</div>) : <div className="empty-state">No VIP purchases yet.</div>}</div>}</section>{selectedCustomer ? <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Purchase history for ${selectedCustomer.name}`}>
  <section className="modal-panel"><div className="modal-header"><div><span className="eyebrow">VIP purchase history</span><h2>{selectedCustomer.name}</h2></div><button className="icon-button bordered" type="button" onClick={() => addMoreItems(selectedCustomer)} title="Add more items" aria-label={`Add more items for ${selectedCustomer.name}`}><Plus size={18} /></button><button className="icon-button bordered" type="button" onClick={() => setSelectedCustomer(null)} title="Close" aria-label="Close"><X size={18} /></button></div><div className="vip-customer-items">{selectedCustomer.items.map((item) => <div className="vip-item-row" key={item.id}><div><strong>{item.quantity}x {item.item_name}</strong><span>{dateTime(item.addedAt)}</span></div><span>{currency(Number(item.unit_price) * item.quantity)}</span><button className={`button ${item.paid ? "secondary-button" : "primary-button"}`} type="button" onClick={() => toggleItem(item)} disabled={item.legacy}><Check size={15} />{item.paid ? "Paid" : "Mark paid"}</button></div>)}</div></section></div> : null}</div>;
}
