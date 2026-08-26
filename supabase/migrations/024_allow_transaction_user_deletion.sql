-- Preserve revenue and VIP history when an Auth user and profile are deleted.
alter table public.transactions drop constraint if exists transactions_created_by_fkey;
alter table public.transactions add constraint transactions_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.vip_purchases alter column created_by drop not null;
alter table public.vip_purchases drop constraint if exists vip_purchases_created_by_fkey;
alter table public.vip_purchases add constraint vip_purchases_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
