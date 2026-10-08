-- =====================================================================
-- SNS OneConnect: database schema, security (RLS) and workflow functions
-- Run once in Supabase > SQL Editor on a fresh project.
-- =====================================================================

-- ---------- Enums ----------
create type public.user_role as enum ('student', 'faculty', 'admin');
create type public.announcement_category as enum
  ('academic', 'exams', 'placement', 'events', 'admin', 'general');
create type public.request_status as enum
  ('submitted', 'under_review', 'completed', 'rejected');

-- ---------- Tables ----------
create table public.departments (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  role          public.user_role not null,
  department_id uuid not null references public.departments (id),
  year          smallint check (year between 1 and 4),
  register_no   text unique,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (role <> 'student' or year is not null)
);
create index profiles_dept_year_idx on public.profiles (department_id, year);

create table public.request_types (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique,
  description           text not null,
  routing               text not null check (routing in ('fixed', 'student_dept')),
  default_department_id uuid references public.departments (id),
  is_active             boolean not null default true,
  check (routing <> 'fixed' or default_department_id is not null)
);

create table public.announcements (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null check (char_length(title) between 3 and 150),
  body                    text not null check (char_length(body) >= 3),
  category                public.announcement_category not null,
  target_department_id    uuid references public.departments (id),      -- null = everyone
  target_year             smallint check (target_year between 1 and 4), -- null = all years
  deadline_at             timestamptz,
  action_request_type_id  uuid references public.request_types (id),
  created_by              uuid not null references public.profiles (id),
  published_at            timestamptz not null default now(),
  created_at              timestamptz not null default now()
);
create index announcements_published_idx on public.announcements (published_at desc);
create index announcements_target_idx on public.announcements (target_department_id, target_year);
create index announcements_deadline_idx on public.announcements (deadline_at) where deadline_at is not null;

create table public.events (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text,
  venue                text,
  starts_at            timestamptz not null,
  ends_at              timestamptz,
  target_department_id uuid references public.departments (id),
  target_year          smallint check (target_year between 1 and 4),
  created_by           uuid references public.profiles (id),
  created_at           timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_starts_idx on public.events (starts_at);

create sequence public.request_seq;

create table public.requests (
  id                      uuid primary key default gen_random_uuid(),
  tracking_id             text not null unique,
  request_type_id         uuid not null references public.request_types (id),
  student_id              uuid not null references public.profiles (id),
  department_id           uuid not null references public.departments (id),
  assigned_to             uuid references public.profiles (id),
  reason                  text not null check (char_length(reason) between 5 and 1000),
  needed_by               date,
  status                  public.request_status not null default 'submitted',
  source_announcement_id  uuid references public.announcements (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  resolved_at             timestamptz
);
create index requests_student_idx on public.requests (student_id, created_at desc);
create index requests_dept_status_idx on public.requests (department_id, status, created_at);

create table public.request_status_history (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  from_status public.request_status,
  to_status   public.request_status not null,
  changed_by  uuid not null references public.profiles (id),
  note        text,
  created_at  timestamptz not null default now()
);
create index history_request_idx on public.request_status_history (request_id, created_at);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- Tracking ID is always generated by the database (SNS-2026-00001)
create function public.set_tracking_id() returns trigger
language plpgsql as $$
begin
  new.tracking_id := 'SNS-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('public.request_seq')::text, 5, '0');
  return new;
end $$;

create trigger trg_set_tracking_id before insert on public.requests
  for each row execute function public.set_tracking_id();

-- ---------- Helper functions used by security policies ----------
-- security definer so they can read profiles without triggering RLS recursion.
-- An inactive account resolves to NULL, which every policy treats as "no access".
create function public.app_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create function public.app_dept() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid() and is_active
$$;

create function public.app_year() returns smallint
language sql stable security definer set search_path = public as $$
  select year from public.profiles where id = auth.uid() and is_active
$$;

-- ---------- Row level security ----------
alter table public.departments            enable row level security;
alter table public.profiles               enable row level security;
alter table public.request_types          enable row level security;
alter table public.announcements          enable row level security;
alter table public.events                 enable row level security;
alter table public.requests               enable row level security;
alter table public.request_status_history enable row level security;
alter table public.notifications          enable row level security;

create policy departments_select on public.departments
  for select to authenticated using (true);

create policy request_types_select on public.request_types
  for select to authenticated using (is_active);

-- Own row, any staff member (so students can see who published a notice),
-- admins see everyone, faculty also see students who raised requests to their department.
create policy profiles_select on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or role in ('faculty', 'admin')
    or public.app_role() = 'admin'
    or exists (
      select 1 from public.requests r
      where r.student_id = profiles.id and r.department_id = public.app_dept()
    )
  );

create policy announcements_select on public.announcements
  for select to authenticated using (
    case public.app_role()
      when 'student' then
        (target_department_id is null or target_department_id = public.app_dept())
        and (target_year is null or target_year = public.app_year())
      when 'faculty' then
        target_department_id is null
        or target_department_id = public.app_dept()
        or created_by = auth.uid()
      when 'admin' then true
      else false
    end
  );

create policy events_select on public.events
  for select to authenticated using (
    case public.app_role()
      when 'student' then
        (target_department_id is null or target_department_id = public.app_dept())
        and (target_year is null or target_year = public.app_year())
      when 'faculty' then
        target_department_id is null
        or target_department_id = public.app_dept()
        or created_by = auth.uid()
      when 'admin' then true
      else false
    end
  );

create policy requests_select on public.requests
  for select to authenticated using (
    public.app_role() is not null
    and (
      student_id = auth.uid()
      or case public.app_role()
           when 'admin' then true
           when 'faculty' then department_id = public.app_dept()
           else false
         end
    )
  );

-- History is visible exactly when the parent request is visible
create policy history_select on public.request_status_history
  for select to authenticated using (
    exists (select 1 from public.requests r where r.id = request_id)
  );

create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Upcoming = deadlines from announcements + events (RLS of the base tables applies)
create view public.upcoming_items with (security_invoker = true) as
  select 'deadline'::text as kind, a.id, a.title, null::text as detail,
         a.deadline_at as at, '/app/announcements/' || a.id::text as link
  from public.announcements a
  where a.deadline_at is not null
  union all
  select 'event'::text, e.id, e.title, e.venue, e.starts_at, null::text
  from public.events e;

-- ---------- Workflow functions (the ONLY way to write business data) ----------

-- Student submits a request
create function public.create_request(
  p_type_id uuid,
  p_reason text,
  p_needed_by date,
  p_source_announcement_id uuid
) returns public.requests
language plpgsql security definer set search_path = public as $$
declare
  v_type public.request_types;
  v_dept uuid;
  v_req  public.requests;
begin
  if public.app_role() is distinct from 'student' then
    raise exception 'Only students can submit requests' using errcode = '42501';
  end if;

  select * into v_type from public.request_types where id = p_type_id and is_active;
  if not found then
    raise exception 'Unknown request type' using errcode = 'P0002';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Please describe your reason in at least 5 characters' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.requests
    where student_id = auth.uid() and request_type_id = p_type_id
      and status in ('submitted', 'under_review')
  ) then
    raise exception 'You already have an active % request. Track it under My requests.', v_type.name
      using errcode = '23505';
  end if;

  v_dept := case when v_type.routing = 'student_dept'
                 then public.app_dept() else v_type.default_department_id end;

  insert into public.requests (request_type_id, student_id, department_id, reason, needed_by, source_announcement_id)
  values (p_type_id, auth.uid(), v_dept, trim(p_reason), p_needed_by, p_source_announcement_id)
  returning * into v_req;

  insert into public.request_status_history (request_id, from_status, to_status, changed_by)
  values (v_req.id, null, 'submitted', auth.uid());

  insert into public.notifications (user_id, title, body, link)
  values (auth.uid(), 'Request submitted',
          v_req.tracking_id || ': ' || v_type.name || ' request submitted',
          '/app/requests/' || v_req.id::text);

  insert into public.notifications (user_id, title, body, link)
  select p.id, 'New request ' || v_req.tracking_id, v_type.name || ' request received',
         '/staff/requests/' || v_req.id::text
  from public.profiles p
  where p.department_id = v_dept and p.role in ('faculty', 'admin') and p.is_active;

  return v_req;
end $$;

-- Staff change a request status (rules enforced here, not in the browser)
create function public.transition_request(
  p_request_id uuid,
  p_new_status public.request_status,
  p_note text
) returns public.requests
language plpgsql security definer set search_path = public as $$
declare
  v_role   public.user_role := public.app_role();
  v_req    public.requests;
  v_old    public.request_status;
  v_note   text := nullif(trim(coalesce(p_note, '')), '');
  v_title  text;
begin
  if v_role is null or v_role = 'student' then
    raise exception 'Only staff can change request status' using errcode = '42501';
  end if;

  select * into v_req from public.requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if v_role = 'faculty' and v_req.department_id is distinct from public.app_dept() then
    raise exception 'This request belongs to another department' using errcode = '42501';
  end if;

  if not (
    (v_req.status = 'submitted'    and p_new_status in ('under_review', 'rejected')) or
    (v_req.status = 'under_review' and p_new_status in ('completed', 'rejected'))
  ) then
    raise exception 'A % request cannot be moved to %', v_req.status, p_new_status
      using errcode = '22023';
  end if;

  if p_new_status = 'rejected' and v_note is null then
    raise exception 'Add a note explaining why the request is rejected' using errcode = '22023';
  end if;

  v_old := v_req.status;

  update public.requests
     set status      = p_new_status,
         assigned_to = case when p_new_status = 'under_review' then auth.uid() else assigned_to end,
         updated_at  = now(),
         resolved_at = case when p_new_status in ('completed', 'rejected') then now() else null end
   where id = v_req.id
   returning * into v_req;

  insert into public.request_status_history (request_id, from_status, to_status, changed_by, note)
  values (v_req.id, v_old, p_new_status, auth.uid(), v_note);

  v_title := case p_new_status
               when 'under_review' then 'Request under review'
               when 'completed'    then 'Ready for collection'
               else                     'Request not approved'
             end;

  insert into public.notifications (user_id, title, body, link)
  values (v_req.student_id, v_title,
          v_req.tracking_id || coalesce(': ' || v_note, ''),
          '/app/requests/' || v_req.id::text);

  return v_req;
end $$;

-- Staff publish an announcement; matching students are notified in one statement
create function public.publish_announcement(
  p_title text,
  p_body text,
  p_category public.announcement_category,
  p_target_department_id uuid,
  p_target_year smallint,
  p_deadline_at timestamptz,
  p_action_request_type_id uuid
) returns public.announcements
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := public.app_role();
  v_row  public.announcements;
begin
  if v_role is null or v_role = 'student' then
    raise exception 'Only faculty and administrators can publish announcements' using errcode = '42501';
  end if;

  -- Faculty: own department only. Admin: any audience, including college-wide.
  if v_role = 'faculty' and p_target_department_id is distinct from public.app_dept() then
    raise exception 'Faculty can only publish to their own department' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_title, ''))) not between 3 and 150 then
    raise exception 'Title must be between 3 and 150 characters' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_body, ''))) < 3 then
    raise exception 'Announcement text is required' using errcode = '22023';
  end if;

  insert into public.announcements
    (title, body, category, target_department_id, target_year, deadline_at, action_request_type_id, created_by)
  values
    (trim(p_title), trim(p_body), p_category, p_target_department_id, p_target_year,
     p_deadline_at, p_action_request_type_id, auth.uid())
  returning * into v_row;

  insert into public.notifications (user_id, title, body, link)
  select p.id, 'New announcement: ' || v_row.title, left(v_row.body, 140),
         '/app/announcements/' || v_row.id::text
  from public.profiles p
  where p.role = 'student' and p.is_active
    and (p_target_department_id is null or p.department_id = p_target_department_id)
    and (p_target_year is null or p.year = p_target_year);

  return v_row;
end $$;

-- "Visible to N students" counter on the announcement form
create function public.count_reach(p_dept uuid, p_year smallint) returns integer
language plpgsql stable security definer set search_path = public as $$
begin
  if public.app_role() is null or public.app_role() = 'student' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return (
    select count(*)::int from public.profiles p
    where p.role = 'student' and p.is_active
      and (p_dept is null or p.department_id = p_dept)
      and (p_year is null or p.year = p_year)
  );
end $$;

-- ---------- Privileges ----------
-- Browsers may only READ tables. All writes go through the functions above,
-- except marking your own notifications as read.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant update (is_read) on public.notifications to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- ---------- Live updates (Supabase Realtime) ----------
alter publication supabase_realtime
  add table public.notifications, public.requests, public.request_status_history;
