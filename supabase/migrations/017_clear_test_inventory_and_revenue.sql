-- One-time production handoff cleanup.
-- Removes test revenue, order history, and inventory while preserving rooms and users.
delete from public.transactions;
delete from public.order_items;
delete from public.orders;
delete from public.inventory_items;
