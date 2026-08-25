-- One-time production handoff cleanup for test VIP history.
delete from public.vip_purchase_items;
delete from public.vip_purchases;
