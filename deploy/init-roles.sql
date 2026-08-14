CREATE ROLE engram_migrator LOGIN PASSWORD 'local-only-migrator' NOSUPERUSER NOBYPASSRLS;
CREATE ROLE engram_app LOGIN PASSWORD 'local-only-app' NOSUPERUSER NOBYPASSRLS;
CREATE ROLE engram_maintenance LOGIN PASSWORD 'local-only-maintenance' NOSUPERUSER NOBYPASSRLS;
ALTER DATABASE engramport OWNER TO engram_migrator;
GRANT CREATE ON SCHEMA public TO engram_migrator;
