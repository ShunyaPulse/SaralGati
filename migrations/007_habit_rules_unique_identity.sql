-- Migration: Enforce one habit per elder/type/payload on habit_rules
--
-- habit_rules never had any uniqueness guarantee, so the `ON CONFLICT` in the
-- habit miner could not fire: every flywheel run appended the same mined habit
-- again, and those duplicates were then all injected back into the AI prompt.
--
-- There is no `name` column on this table - a habit's identity is its
-- rule_type plus its rule_payload - so the unique index covers
-- (elder_id, rule_type, rule_payload). JSONB has a btree operator class, so a
-- jsonb column can be indexed directly, and jsonb equality ignores key order,
-- which means {"name":"Rahul"} and {"name": "Rahul"} collide as they should.

-- 1. Drop the duplicates that accumulated while no constraint existed. Without
--    this step CREATE UNIQUE INDEX fails on any database the miner has already
--    run against. Per duplicate group keep the active row if there is one (a
--    rule the caregiver re-enabled wins over a stale inactive copy), otherwise
--    the oldest row.
DELETE FROM habit_rules h
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY elder_id, rule_type, rule_payload
           ORDER BY is_active DESC NULLS LAST, created_at ASC NULLS LAST, id ASC
         ) AS rn
  FROM habit_rules
) dup
WHERE h.id = dup.id AND dup.rn > 1;

-- 2. The constraint the insert paths rely on.
CREATE UNIQUE INDEX IF NOT EXISTS uq_habit_rules_elder_identity
  ON habit_rules (elder_id, rule_type, rule_payload);
