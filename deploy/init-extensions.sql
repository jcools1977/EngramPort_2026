\set ON_ERROR_STOP on
-- Local Docker stands in for the managed-platform extension boundary. This file
-- runs as the image bootstrap superuser; ordinary migrations remain unprivileged.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
