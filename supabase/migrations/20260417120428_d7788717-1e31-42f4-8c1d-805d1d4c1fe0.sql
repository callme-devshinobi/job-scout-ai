
SELECT cron.schedule(
  'daily-fetch-jobs',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bjpnuthtfxomzbuozelm.supabase.co/functions/v1/fetch-jobs',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
