-- Adds username-based login to the V1 schema.
alter table public.profiles add column if not exists username text;

update public.profiles profile
set username = lower(split_part(auth_user.email, '@', 1))
from auth.users auth_user
where auth_user.id = profile.id and profile.username is null;

alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_unique on public.profiles (lower(username));

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.login_email_for_username(p_username text)
returns text
language sql
stable
security definer set search_path = public, auth
as $$
  select auth_user.email
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.id
  where lower(profile.username) = lower(trim(p_username))
  limit 1;
$$;

drop policy if exists "profiles update own" on public.profiles;
grant execute on function public.login_email_for_username(text) to anon, authenticated;
