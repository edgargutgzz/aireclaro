-- field_history: the whole marker field over a window, hourly buckets, as one
-- row per sensor with parallel hours[] / pm25[] arrays.
--
-- Why: the time scrubber needs ~2 weeks of every sensor at once. Pulling that
-- as raw measurement rows is ~100k+ rows and dozens of paged requests; this
-- aggregates in the database and returns ~180 rows whatever the window length.
--
-- Run this once in the Supabase SQL editor. /api/field-history calls it and
-- falls back to a short paged fetch if it isn't there yet, so deploying before
-- running this is safe — you just get a few days instead of two weeks.
--
-- time_stamp is stored as naive Monterrey wall-clock (see lib/monterrey-time.ts),
-- so since_ts is passed in the same naive terms and the hour keys come out as
-- "YYYY-MM-DDTHH", matching monterreyHourKey() on the client.

-- sensor_id is text: PurpleAir ids are numeric but SIMA station ids are string
-- codes ("SE", "NO", "Norte2"…), so both are cast to text and the client keys
-- everything on String(sensor_id).
create or replace function field_history(since_ts timestamp without time zone)
returns table (
  sensor_id text,
  source    text,
  hours     text[],
  pm25      numeric[]
)
language sql
stable
as $$
  with buckets as (
    select
      m.sensor_id::text as sensor_id,
      'purpleAir'::text as source,
      to_char(date_trunc('hour', m.time_stamp), 'YYYY-MM-DD"T"HH24') as hour_key,
      round(avg(m.pm25)::numeric, 1) as pm25
    from purpleair_mediciones m
    where m.time_stamp >= since_ts and m.pm25 > 0.4
    group by m.sensor_id, date_trunc('hour', m.time_stamp)

    union all

    select
      m.sensor_id::text as sensor_id,
      'sima'::text      as source,
      to_char(date_trunc('hour', m.time_stamp), 'YYYY-MM-DD"T"HH24') as hour_key,
      round(avg(m.pm25)::numeric, 1) as pm25
    from sima_mediciones m
    where m.time_stamp >= since_ts and m.pm25 > 0.4
    group by m.sensor_id, date_trunc('hour', m.time_stamp)
  )
  select
    b.sensor_id,
    b.source,
    array_agg(b.hour_key order by b.hour_key) as hours,
    array_agg(b.pm25     order by b.hour_key) as pm25
  from buckets b
  group by b.sensor_id, b.source;
$$;

grant execute on function field_history(timestamp without time zone) to anon, authenticated;

-- Both measurement tables should already have an index on time_stamp for the
-- existing windowed queries; if not:
--   create index on purpleair_mediciones (time_stamp);
--   create index on sima_mediciones (time_stamp);
