-- Add billed and actual room-time durations to revenue summaries.
create or replace view public.daily_revenue as
select
  date_trunc('day', transaction_log.created_at)::date as day,
  sum(transaction_log.amount) filter (where transaction_log.kind = 'SESSION') as session_revenue,
  sum(transaction_log.amount) filter (where transaction_log.kind = 'ORDER') as order_revenue,
  sum(transaction_log.amount) as total_revenue,
  coalesce(sum(
    greatest(60, round(extract(epoch from (session.end_time - session.start_time)) / 900.0) * 15)
  ) filter (where transaction_log.kind = 'SESSION' and session.id is not null), 0) as billed_session_minutes,
  coalesce(sum(
    extract(epoch from (session.end_time - session.start_time)) / 60.0
  ) filter (where transaction_log.kind = 'SESSION' and session.id is not null), 0) as actual_session_minutes
from public.transactions transaction_log
left join public.sessions session on session.id = transaction_log.session_id
group by 1
order by 1 desc;

create or replace view public.monthly_revenue as
select
  date_trunc('month', transaction_log.created_at)::date as month,
  sum(transaction_log.amount) filter (where transaction_log.kind = 'SESSION') as session_revenue,
  sum(transaction_log.amount) filter (where transaction_log.kind = 'ORDER') as order_revenue,
  sum(transaction_log.amount) as total_revenue,
  coalesce(sum(
    greatest(60, round(extract(epoch from (session.end_time - session.start_time)) / 900.0) * 15)
  ) filter (where transaction_log.kind = 'SESSION' and session.id is not null), 0) as billed_session_minutes,
  coalesce(sum(
    extract(epoch from (session.end_time - session.start_time)) / 60.0
  ) filter (where transaction_log.kind = 'SESSION' and session.id is not null), 0) as actual_session_minutes
from public.transactions transaction_log
left join public.sessions session on session.id = transaction_log.session_id
group by 1
order by 1 desc;

grant select on public.daily_revenue to authenticated;
grant select on public.monthly_revenue to authenticated;
