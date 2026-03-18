-- =============================================
-- رحلاتي — Supabase Schema
-- انسخ هذا الكود وشغّله في:
-- Supabase Dashboard → SQL Editor → New Query
-- =============================================

create table if not exists public.users (
  uid text primary key,
  email text unique not null,
  "displayName" text,
  role text default 'user',
  "phoneNumber" text,
  "loyaltyPoints" integer default 0,
  "createdAt" text
);

create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  "plateNumber" text unique,
  model text,
  year integer,
  capacity integer,
  status text default 'active',
  "lastMaintenanceDate" text,
  "nextMaintenanceDate" text,
  image text,
  "createdAt" text
);

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  "busId" uuid references public.buses(id) on delete cascade,
  description text,
  cost real,
  date text,
  technician text
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  "busId" uuid references public.buses(id),
  origin text,
  destination text,
  "departureTime" text,
  "arrivalTime" text,
  price real,
  "busType" text,
  "totalSeats" integer,
  "availableSeats" integer,
  "bookedSeats" jsonb default '[]',
  amenities jsonb default '[]',
  "isFeatured" boolean default false,
  rating real default 5,
  "reviewCount" integer default 0,
  image text
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  "userId" text references public.users(uid),
  "tripId" uuid references public.trips(id),
  "tripOrigin" text,
  "tripDestination" text,
  seats jsonb default '[]',
  "totalPrice" real,
  status text default 'confirmed',
  "paymentMethod" text,
  "pointsEarned" integer default 0,
  "createdAt" text
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  "userId" text,
  "userName" text,
  rating integer,
  comment text,
  "createdAt" text
);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text,
  image text,
  count text,
  lat real,
  lng real
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  "userId" text,
  "userName" text,
  "lastMessage" text,
  "updatedAt" text,
  status text default 'active'
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  "chatId" uuid references public.chats(id) on delete cascade,
  text text,
  "senderId" text,
  "senderName" text,
  "isAdmin" boolean default false,
  "createdAt" text
);

-- =============================================
-- Row Level Security (RLS) — مهم جداً
-- =============================================
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.bookings enable row level security;
alter table public.buses enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.reviews enable row level security;
alter table public.destinations enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- السماح للجميع بقراءة الرحلات والوجهات والمراجعات
create policy "trips_read_all" on public.trips for select using (true);
create policy "destinations_read_all" on public.destinations for select using (true);
create policy "reviews_read_all" on public.reviews for select using (true);
create policy "buses_read_all" on public.buses for select using (true);

-- السماح للمستخدم المسجل بكتابة بياناته
create policy "users_manage_own" on public.users for all using (auth.uid()::text = uid);
create policy "bookings_manage_own" on public.bookings for all using (auth.uid()::text = "userId");
create policy "chats_manage_own" on public.chats for all using (auth.uid()::text = "userId");
create policy "messages_read_all" on public.messages for select using (true);
create policy "messages_insert_auth" on public.messages for insert with check (auth.uid() is not null);

-- السماح للأدمن بكل العمليات (role = admin في جدول users)
create policy "admin_full_trips" on public.trips for all
  using (exists (select 1 from public.users where uid = auth.uid()::text and role = 'admin'));
create policy "admin_full_buses" on public.buses for all
  using (exists (select 1 from public.users where uid = auth.uid()::text and role = 'admin'));
create policy "admin_full_maintenance" on public.maintenance_logs for all
  using (exists (select 1 from public.users where uid = auth.uid()::text and role = 'admin'));
create policy "admin_full_destinations" on public.destinations for all
  using (exists (select 1 from public.users where uid = auth.uid()::text and role = 'admin'));
create policy "admin_full_reviews" on public.reviews for all
  using (exists (select 1 from public.users where uid = auth.uid()::text and role = 'admin'));
create policy "admin_read_bookings" on public.bookings for select
  using (exists (select 1 from public.users where uid = auth.uid()::text and role = 'admin'));
create policy "admin_full_chats" on public.chats for all
  using (exists (select 1 from public.users where uid = auth.uid()::text and role = 'admin'));
