-- Preserve operational history when an Auth user and their profile are deleted.
alter table public.reservations drop constraint if exists reservations_created_by_fkey;
alter table public.reservations add constraint reservations_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.sessions drop constraint if exists sessions_started_by_fkey;
alter table public.sessions add constraint sessions_started_by_fkey
  foreign key (started_by) references public.profiles(id) on delete set null;

alter table public.orders drop constraint if exists orders_created_by_fkey;
alter table public.orders add constraint orders_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.transactions drop constraint if exists transactions_created_by_fkey;
alter table public.transactions add constraint transactions_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.vip_purchases alter column created_by drop not null;
alter table public.vip_purchases drop constraint if exists vip_purchases_created_by_fkey;
alter table public.vip_purchases add constraint vip_purchases_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;