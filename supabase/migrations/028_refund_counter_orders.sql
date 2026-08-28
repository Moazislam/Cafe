-- Keep order refunds in the transaction log so revenue and stock stay auditable.
alter table public.transactions
  drop constraint if exists transactions_amount_check;

alter table public.transactions
  add column if not exists refund_of uuid references public.transactions(id) on delete restrict;

alter table public.transactions
  add column if not exists refunded_at timestamptz;

create unique index if not exists transactions_refund_of_unique
  on public.transactions(refund_of) where refund_of is not null;

create or replace function public.refund_order_transaction(p_transaction_id uuid)
returns public.transactions
language plpgsql
security definer set search_path = public
as $$
declare
  v_transaction public.transactions;
  v_refund public.transactions;
  v_item record;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;

  select * into v_transaction
  from public.transactions
  where id = p_transaction_id and kind = 'ORDER'
  for update;
  if not found then raise exception 'Counter order transaction not found'; end if;
  if v_transaction.refund_of is not null or exists (
    select 1 from public.transactions where refund_of = v_transaction.id
  ) then
    raise exception 'Counter order has already been undone';
  end if;
  if v_transaction.order_id is null then raise exception 'Transaction is not tied to an order'; end if;

  for v_item in
    select inventory_item_id, quantity
    from public.order_items
    where order_id = v_transaction.order_id
  loop
    update public.inventory_items
      set quantity = quantity + v_item.quantity
      where id = v_item.inventory_item_id;
  end loop;

  update public.transactions
    set refunded_at = now()
    where id = v_transaction.id;

  insert into public.transactions (kind, amount, room_id, order_id, refund_of, created_by)
    values ('ORDER', -v_transaction.amount, v_transaction.room_id, v_transaction.order_id, v_transaction.id, auth.uid())
    returning * into v_refund;

  return v_refund;
end;
$$;

revoke all on function public.refund_order_transaction(uuid) from public;
grant execute on function public.refund_order_transaction(uuid) to authenticated;