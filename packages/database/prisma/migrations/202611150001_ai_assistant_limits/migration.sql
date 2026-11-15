-- The assistant now reads the paper and the project, and answers follow-up questions.
-- Only the former defaults move; limits an administrator chose stay as they are.
UPDATE "Setting"
SET "value" = jsonb_set("value"::jsonb, '{aiInputTokenLimit}', '48000'::jsonb)
WHERE "id" = 'site' AND ("value"::jsonb -> 'aiInputTokenLimit') = '12000'::jsonb;
UPDATE "Setting"
SET "value" = jsonb_set("value"::jsonb, '{aiDailyLimit}', '30'::jsonb)
WHERE "id" = 'site' AND ("value"::jsonb -> 'aiDailyLimit') = '5'::jsonb;
