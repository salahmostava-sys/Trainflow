-- Retire the removed messaging integration; preserve stock and trainee data.
-- Guards also allow this migration on a database without the old feature.
do $$
declare job bigint;
begin
  if to_regclass('cron.job') is not null then
    for job in select jobid from cron.job where jobname='ibta-inventory-whatsapp' loop
      perform cron.unschedule(job);
    end loop;
  end if;
  if to_regclass('vault.secrets') is not null then
    delete from vault.secrets where name='ibta_whatsapp_inventory_token';
  end if;
end $$;

drop function if exists public.ibta_save_inventory_delivery(jsonb);
drop function if exists public.ibta_inventory_delivery_status();
drop function if exists private.ibta_save_inventory_delivery(jsonb);
drop function if exists private.ibta_inventory_delivery_status();
drop function if exists private.ibta_inventory_delivery_tick();
drop function if exists private.ibta_inventory_meta_tick();
drop table if exists private.ibta_inventory_delivery;
drop table if exists private.ibta_inventory_delivery_log;
drop function if exists private.ibta_inventory_delivery_validate();
drop function if exists private.ibta_inventory_template_parameters(date);

update public.ibta_settings
set payload=payload - 'inventoryWhatsappNumber', version=version+1
where id=1 and payload ? 'inventoryWhatsappNumber';
