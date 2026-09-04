CREATE TABLE "wo_counters" (
	"period" text PRIMARY KEY NOT NULL,
	"last_seq" integer NOT NULL
);

-- §2.1: "Seed the counter from the imported data... Skipping this makes the
-- first new work order collide with an imported one." Whatever's already in
-- work_orders at the time this migration runs (imported or not) sets the
-- floor for each period's counter. A later import's own promotion is
-- responsible for extending this further (see scripts/promote_staging.sql).
INSERT INTO wo_counters (period, last_seq)
SELECT left(wo_no, 4), max(right(wo_no, 3)::int)
FROM work_orders
GROUP BY left(wo_no, 4)
ON CONFLICT (period) DO UPDATE SET last_seq = GREATEST(wo_counters.last_seq, excluded.last_seq);
