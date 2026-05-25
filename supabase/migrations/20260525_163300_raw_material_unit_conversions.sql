create table if not exists public.raw_material_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  raw_material_id uuid not null references public.raw_materials(id) on delete cascade,
  satuan_id uuid not null references public.units(id),
  qty_in_base_unit numeric not null check (qty_in_base_unit > 0),
  is_base boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null,
  unique(raw_material_id, satuan_id)
);

create index if not exists idx_raw_material_unit_conversions_material_id
  on public.raw_material_unit_conversions(raw_material_id);

create index if not exists idx_raw_material_unit_conversions_satuan_id
  on public.raw_material_unit_conversions(satuan_id);

alter table public.raw_material_unit_conversions enable row level security;

drop policy if exists "Allow all" on public.raw_material_unit_conversions;
create policy "Allow all" on public.raw_material_unit_conversions
for all
using (true)
with check (true);

insert into public.raw_material_unit_conversions (raw_material_id, satuan_id, qty_in_base_unit, is_base, is_active)
select rm.id, rm.satuan_kecil_id, 1, true, true
from public.raw_materials rm
where rm.satuan_kecil_id is not null
  and rm.deleted_at is null
on conflict (raw_material_id, satuan_id) do update
set qty_in_base_unit = excluded.qty_in_base_unit,
    is_base = true,
    is_active = true,
    updated_at = now();

insert into public.raw_material_unit_conversions (raw_material_id, satuan_id, qty_in_base_unit, is_base, is_active)
select rm.id,
       rm.satuan_besar_id,
       coalesce(nullif(rm.konversi_factor, 0), 1),
       rm.satuan_kecil_id is null,
       true
from public.raw_materials rm
where rm.satuan_besar_id is not null
  and rm.deleted_at is null
on conflict (raw_material_id, satuan_id) do update
set qty_in_base_unit = excluded.qty_in_base_unit,
    is_base = excluded.is_base,
    is_active = true,
    updated_at = now();
