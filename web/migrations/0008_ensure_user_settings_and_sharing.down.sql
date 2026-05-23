-- Down migration 0008: only drops tables created for repair (optional rollback).
BEGIN;

DROP TABLE IF EXISTS meal_plans;
DROP TABLE IF EXISTS shared_recipe_views;
DROP TABLE IF EXISTS shared_recipe_likes;
DROP TABLE IF EXISTS user_settings;

COMMIT;
