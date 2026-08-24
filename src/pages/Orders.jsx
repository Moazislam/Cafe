import { ReceiptText } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { OrderPanel } from "../components/OrderPanel";
import { currency, time } from "../utils";

export function Orders({ standalone = false }) {
  const cafe = useOutletContext();
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">Counter sales</span><h1>Orders</h1><p>Add items to active rooms and keep stock accurate in the same transaction.</p></div></section><section className="orders-layout"><section className="section-surface"><div className="section-heading"><div><h2>New order</h2><p>Only active rooms can receive counter orders.</p></div><ReceiptText size={21} /></div><OrderPanel inventory={cafe.inventory} activeSessions={cafe.activeSessions} onComplete={cafe.refresh} /></section><section className="section-surface"><div className="section-heading"><div><h2>Recent orders</h2><p>{cafe.orders.length} orders on record.</p></div></div><div className="order-history">{cafe.orders.length ? cafe.orders.map((order) => <article key={order.id} className="order-history-item"><div><strong>{order.rooms?.name || "Counter order"}</strong><span>{time(order.created_at)} · {(order.order_items || []).map((item) => `${item.quantity}x ${item.inventory_items?.name || "Item"}`).join(", ")}</span></div><strong>{currency(order.total)}</strong></article>) : <div className="empty-state">No orders yet.</div>}</div></section></section></div>;
}
