-- field_history: the whole marker field over a window, hourly buckets, as one
-- row per sensor with parallel hours[] / pm25[] arrays.
--
-- Why: the time scrubber needs the full 2026-07-01 -> now window of every
-- sensor at once. As raw measurement rows that's ~250k rows and dozens of
-- paged requests; this aggregates in the database and returns ~200 rows.
--
-- Run in the Supabase SQL editor. /api/field-history calls it and retries a
-- statement-timeout (57014) before falling back to a short paged fetch, so
-- deploying before this exists is safe — you just get ~4 days of PurpleAir.
--
-- Notes:
--  * sensor_id is text — PurpleAir ids are numeric, SIMA station ids are string
--    codes ("SE", "NO", "Norte2"…); the client keys on String(sensor_id).
--  * pm25 is averaged as float8 (avg(numeric) is ~10x slower) and rounded to int.
--  * pm25 > 0.4 is the "valid reading" filter — drops nulls, SIMA's -9999, and
--    near-zero noise, matching the client.
--  * The window aggregation runs ~3s; SET statement_timeout lifts the function
--    off the role default so a cold call isn't killed mid-flight.
--  * time_stamp is naive Monterrey wall-clock (lib/monterrey-time.ts); since_ts
--    is passed the same way and hour keys come out "YYYY-MM-DDTHH".

drop function if exists field_history(timestamp without time zone);

create function field_history(since_ts timestamp without time zone)
returns table (
  sensor_id text,
  source    text,
  hours     text[],
  pm25      int[]
)
language sql
stable
set statement_timeout = '30s'
as $$
  with buckets as (
    select
      m.sensor_id::text as sensor_id,
      'purpleAir'::text as source,
      to_char(date_trunc('hour', m.time_stamp), 'YYYY-MM-DD"T"HH24') as hour_key,
      round(avg(m.pm25::float8))::int as pm25
    from purpleair_mediciones m
    where m.time_stamp >= since_ts and m.pm25 > 0.4
    group by m.sensor_id, date_trunc('hour', m.time_stamp)

    union all

    select
      m.sensor_id::text as sensor_id,
      'sima'::text as source,
      to_char(date_trunc('hour', m.time_stamp), 'YYYY-MM-DD"T"HH24') as hour_key,
      round(avg(m.pm25::float8))::int as pm25
    from sima_mediciones m
    where m.time_stamp >= since_ts and m.pm25 > 0.4
    group by m.sensor_id, date_trunc('hour', m.time_stamp)
  )
  select
    b.sensor_id,
    b.source,
    array_agg(b.hour_key order by b.hour_key) as hours,
    array_agg(b.pm25 order by b.hour_key) as pm25
  from buckets b
  group by b.sensor_id, b.source;
$$;

grant execute on function field_history(timestamp without time zone) to anon, authenticated;

-- Supporting indexes (safe to re-run; drop "concurrently" if the editor rejects
-- it inside a transaction):
-- create index concurrently if not exists purpleair_mediciones_field_history_idx
--   on purpleair_mediciones (time_stamp, sensor_id, pm25) where pm25 > 0.4;
-- create index concurrently if not exists sima_mediciones_field_history_idx
--   on sima_mediciones (time_stamp, sensor_id, pm25) where pm25 > 0.4;
