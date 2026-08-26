\set ON_ERROR_STOP on
BEGIN;

INSERT INTO founder_external_identities(identity_id,issuer,subject)
VALUES (
  '56000000-0000-0000-0000-000000000001',
  'https://issuer.synthetic.invalid',
  'founder-enrollment-issuer-test'
);

DO $$
BEGIN
  IF has_function_privilege(
    'engram_maintenance',
    'issue_founding_authorization(uuid,uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'engram_maintenance unexpectedly has founding issuer EXECUTE';
  END IF;
  IF NOT has_function_privilege(
    'engram_bootstrap_operator',
    'issue_founding_authorization(uuid,uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'engram_bootstrap_operator lacks founding issuer EXECUTE';
  END IF;
END $$;

SET LOCAL ROLE engram_app;
DO $$
BEGIN
  BEGIN
    PERFORM issue_founding_authorization(
      '57000000-0000-0000-0000-000000000001',
      '56000000-0000-0000-0000-000000000001',
      '58000000-0000-0000-0000-000000000001',
      '59000000-0000-0000-0000-000000000001',
      clock_timestamp()+interval '1 hour'
    );
    RAISE EXCEPTION 'engram_app unexpectedly executed founding issuer';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

SET LOCAL ROLE engram_bootstrap_operator;
SELECT issue_founding_authorization(
  '57000000-0000-0000-0000-000000000002',
  '56000000-0000-0000-0000-000000000001',
  '58000000-0000-0000-0000-000000000002',
  '59000000-0000-0000-0000-000000000002',
  clock_timestamp()+interval '1 hour'
);
RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM founding_authorizations
      WHERE authorization_id='57000000-0000-0000-0000-000000000002'
        AND identity_id='56000000-0000-0000-0000-000000000001'
        AND consumed_at IS NULL
        AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'bootstrap operator issuance did not persist expected state';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM founding_authorizations
      WHERE authorization_id='57000000-0000-0000-0000-000000000001'
  ) THEN
    RAISE EXCEPTION 'refused app issuance left authorization residue';
  END IF;
END $$;

ROLLBACK;
