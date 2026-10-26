
create type public.app_role as enum ('admin','customer');
create type public.order_status as enum ('pending','paid','shipped','delivered','cancelled');

create table public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in ('Electronics','Fashion','Home','Accessories')),
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy "products public read" on public.products for select to anon, authenticated using (true);
create policy "admin insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update products" on public.products for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  status public.order_status not null default 'paid',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own or admin read orders" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0)
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items readable with order" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);

-- First registered user becomes admin; everyone gets customer
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles(user_id, role) values (new.id, 'customer');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users for each row execute function public.handle_new_user_role();

-- Server-side order placement: recalculates prices, checks stock, atomic, idempotent
create or replace function public.place_order(
  _items jsonb, _customer_name text, _email text, _phone text, _address text, _idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _existing public.orders;
  _item jsonb; _p public.products; _qty int;
  _subtotal numeric := 0; _shipping numeric; _discount numeric; _total numeric;
  _order_id uuid; _num text;
begin
  if _uid is null then raise exception 'Please sign in to place an order'; end if;
  select * into _existing from public.orders where user_id = _uid and idempotency_key = _idempotency_key;
  if found then return jsonb_build_object('order_id', _existing.id, 'order_number', _existing.order_number); end if;
  if char_length(trim(coalesce(_customer_name,''))) not between 2 and 100 then raise exception 'Invalid name'; end if;
  if coalesce(_email,'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(_email) > 255 then raise exception 'Invalid email'; end if;
  if coalesce(_phone,'') !~ '^\+?[0-9 \-]{7,20}$' then raise exception 'Invalid phone number'; end if;
  if char_length(trim(coalesce(_address,''))) not between 10 and 500 then raise exception 'Invalid address'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 50 then
    raise exception 'Cart is empty'; end if;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item->>'quantity')::int;
    select * into _p from public.products where id = _item->>'product_id' for update;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if _qty is null or _qty < 1 or _qty > 99 then raise exception 'Invalid quantity for %', _p.name; end if;
    if _qty > _p.stock then raise exception 'Only % of % left in stock', _p.stock, _p.name; end if;
    _subtotal := _subtotal + _p.price * _qty;
  end loop;

  _shipping := case when _subtotal >= 100 then 0 else 9.99 end;
  _discount := case when _subtotal >= 200 then round(_subtotal * 0.10, 2) else 0 end;
  _total := _subtotal + _shipping - _discount;
  _num := 'SE-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.orders(order_number,user_id,customer_name,email,phone,address,subtotal,shipping,discount,total,status,idempotency_key)
  values (_num,_uid,trim(_customer_name),trim(_email),trim(_phone),trim(_address),_subtotal,_shipping,_discount,_total,'paid',_idempotency_key)
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item->>'quantity')::int;
    select * into _p from public.products where id = _item->>'product_id';
    insert into public.order_items(order_id,product_id,product_name,unit_price,quantity) values (_order_id,_p.id,_p.name,_p.price,_qty);
    update public.products set stock = stock - _qty where id = _p.id;
  end loop;

  return jsonb_build_object('order_id', _order_id, 'order_number', _num);
end $$;
revoke execute on function public.place_order(jsonb,text,text,text,text,text) from public, anon;
grant execute on function public.place_order(jsonb,text,text,text,text,text) to authenticated;

insert into public.products (id,name,description,category,price,image_url,stock,rating) values
('P001','Aurora Wireless Headphones','Over-ear noise cancelling headphones with 30-hour battery life.','Electronics',129.99,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',25,4.6),
('P002','Pulse Smartwatch','Fitness tracking, heart-rate monitor and 7-day battery.','Electronics',199.00,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',12,4.4),
('P003','Nimbus Bluetooth Speaker','Portable waterproof speaker with deep bass.','Electronics',59.50,'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',40,4.2),
('P004','Vertex Mechanical Keyboard','Hot-swappable switches and warm backlight.','Electronics',89.00,null,3,4.7),
('P005','Classic Denim Jacket','Rinsed indigo denim with a relaxed fit.','Fashion',74.00,'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800',18,4.3),
('P006','Linen Summer Shirt','Breathable linen shirt for warm days.','Fashion',39.99,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',30,4.1),
('P007','Trail Runner Sneakers','Lightweight running shoes with grippy soles.','Fashion',94.00,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',0,4.5),
('P008','Ceramic Pour-Over Set','Hand-glazed dripper with matching carafe.','Home',45.00,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',22,4.8),
('P009','Woven Throw Blanket','Soft cotton throw in oatmeal tones.','Home',52.00,'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=800',15,4.4),
('P010','Oak Desk Lamp','Solid oak base with dimmable warm LED.','Home',68.00,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',4,4.0),
('P011','Leather Card Wallet','Slim full-grain leather wallet, 6 card slots.','Accessories',29.00,'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800',50,4.6),
('P012','Polarized Sunglasses','UV400 polarized lenses with acetate frame.','Accessories',49.00,'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800',27,4.3),
('P013','Canvas Weekender Bag','Waxed canvas duffel with leather handles.','Accessories',110.00,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',8,4.5);
