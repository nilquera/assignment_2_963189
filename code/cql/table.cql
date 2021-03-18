CREATE TABLE coredms.metrics (
    dev_id text,
    month text,
    ts timestamp,
    acceleration double,
    acceleration_x double,
    acceleration_y double,
    acceleration_z double,
    battery double,
    humidity double,
    pressure double,
    temperature double,
    primary key((dev_id, month), ts)
) WITH CLUSTERING ORDER BY (ts DESC)
    AND COMPACTION = {'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 1};