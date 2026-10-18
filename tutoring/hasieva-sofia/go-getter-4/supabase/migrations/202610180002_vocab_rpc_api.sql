-- Expose service-only app RPCs used by the Telegram-verified Edge Function.
-- Existing function grants and RLS remain the access boundary.
do $$ begin
  if exists(select 1 from pg_roles where rolname = 'authenticator') then
    alter role authenticator set pgrst.db_schemas = 'public, graphql_public, app';
  end if;
end $$;
notify pgrst, 'reload config';
