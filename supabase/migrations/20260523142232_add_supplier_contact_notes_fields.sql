alter table public.suppliers
  add column if not exists telepon varchar(50),
  add column if not exists pic_email varchar(120),
  add column if not exists catatan text;

comment on column public.suppliers.telepon is 'Nomor telepon utama perusahaan supplier';
comment on column public.suppliers.pic_email is 'Email PIC supplier';
comment on column public.suppliers.catatan is 'Catatan internal supplier';

update public.suppliers
set payment_terms = case payment_terms
  when 'COD' then 'CBD'
  when 'NET7' then 'TOP7'
  when 'NET14' then 'TOP14'
  when 'NET30' then 'TOP30'
  when 'NET45' then 'TOP45'
  when 'NET60' then 'TOP60'
  when 'NET 30' then 'TOP30'
  else payment_terms
end
where payment_terms in ('COD', 'NET7', 'NET14', 'NET30', 'NET45', 'NET60', 'NET 30');

update public.suppliers
set status = 'blocked'
where status = 'blacklisted';

alter table public.suppliers
  drop constraint if exists suppliers_status_check;

alter table public.suppliers
  add constraint suppliers_status_check
  check (status in ('active', 'inactive', 'probation', 'blocked', 'draft'));

comment on constraint suppliers_status_check on public.suppliers is
  'Status supplier yang didukung Purchasing UI';
