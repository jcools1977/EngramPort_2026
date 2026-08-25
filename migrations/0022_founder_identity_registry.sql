BEGIN;

-- ADR 0027 keeps external authentication identity global while every
-- authorization/audit principal remains tenant-local. These relations are
-- never directly readable by an authenticating caller.
CREATE TABLE founder_external_identities (
  identity_id uuid PRIMARY KEY,
  issuer text NOT NULL CHECK (issuer<>''),
  subject text NOT NULL CHECK (subject<>''),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (issuer,subject)
);

CREATE TABLE founder_tenant_bindings (
  binding_id uuid PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES founder_external_identities(identity_id),
  tenant_id uuid NOT NULL,
  principal_id uuid NOT NULL,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (identity_id,tenant_id),
  UNIQUE (principal_id),
  FOREIGN KEY (tenant_id,principal_id) REFERENCES principals(tenant_id,id)
);

-- This is issuance state, not an issuance boundary. ADR 0027 records the
-- missing threat-model row for the out-of-band authority that creates it.
CREATE TABLE founding_authorizations (
  authorization_id uuid PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES founder_external_identities(identity_id),
  reserved_principal_id uuid NOT NULL UNIQUE,
  reserved_tenant_id uuid NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (expires_at>created_at),
  CHECK (consumed_at IS NULL OR consumed_at>=created_at)
);

ALTER TABLE founder_external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_external_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE founder_tenant_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_tenant_bindings FORCE ROW LEVEL SECURITY;
ALTER TABLE founding_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE founding_authorizations FORCE ROW LEVEL SECURITY;

CREATE POLICY founder_external_identity_owner ON founder_external_identities
  USING (current_user='engram_migrator')
  WITH CHECK (current_user='engram_migrator');
CREATE POLICY founder_tenant_binding_owner ON founder_tenant_bindings
  USING (current_user='engram_migrator')
  WITH CHECK (current_user='engram_migrator');
CREATE POLICY founding_authorization_owner ON founding_authorizations
  USING (current_user='engram_migrator')
  WITH CHECK (current_user='engram_migrator');

CREATE FUNCTION resolve_founder_principal(
  p_issuer text,
  p_subject text,
  p_binding_id uuid DEFAULT NULL,
  p_founding_authorization_id uuid DEFAULT NULL,
  p_asserted_principal_id uuid DEFAULT NULL,
  p_asserted_tenant_id uuid DEFAULT NULL
) RETURNS TABLE(principal_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  identity_row founder_external_identities%ROWTYPE;
  authorization_row founding_authorizations%ROWTYPE;
  resolved_principal uuid;
  binding_disabled_at timestamptz;
  active_count bigint;
  total_count bigint;
  binding_conflict boolean;
BEGIN
  SELECT * INTO identity_row
    FROM founder_external_identities i
    WHERE i.issuer=p_issuer AND i.subject=p_subject
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FOUNDER_BINDING_ABSENT' USING ERRCODE='42501';
  END IF;
  IF identity_row.disabled_at IS NOT NULL /* W1_1_BINDING_DISABLED_GUARD */ THEN
    RAISE EXCEPTION 'FOUNDER_BINDING_DISABLED' USING ERRCODE='42501';
  END IF;

  IF p_binding_id IS NOT NULL AND p_founding_authorization_id IS NOT NULL THEN
    RAISE EXCEPTION 'FOUNDER_BINDING_CONFLICT' USING ERRCODE='42501';
  END IF;

  IF p_founding_authorization_id IS NOT NULL THEN
    SELECT * INTO authorization_row
      FROM founding_authorizations a
      WHERE a.authorization_id=p_founding_authorization_id
      FOR UPDATE;
    IF NOT FOUND
      OR authorization_row.identity_id<>identity_row.identity_id
      OR authorization_row.revoked_at IS NOT NULL
      OR authorization_row.consumed_at IS NOT NULL
      OR authorization_row.expires_at<=clock_timestamp() THEN
      RAISE EXCEPTION 'FOUNDER_BINDING_ABSENT' USING ERRCODE='42501';
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM founder_tenant_bindings b
      WHERE b.principal_id=authorization_row.reserved_principal_id
        AND b.identity_id<>identity_row.identity_id
    ) INTO binding_conflict;
    IF binding_conflict /* W1_1_BINDING_CONFLICT_GUARD */ THEN
      RAISE EXCEPTION 'FOUNDER_BINDING_CONFLICT' USING ERRCODE='42501';
    END IF;

    UPDATE founding_authorizations
      SET consumed_at=clock_timestamp()
      WHERE authorization_id=authorization_row.authorization_id
        AND consumed_at IS NULL
        AND revoked_at IS NULL
        AND expires_at>clock_timestamp()
      RETURNING reserved_principal_id INTO resolved_principal;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FOUNDER_BINDING_ABSENT' USING ERRCODE='42501';
    END IF;
    RETURN QUERY SELECT resolved_principal;
    RETURN;
  END IF;

  IF p_binding_id IS NOT NULL THEN
    SELECT b.principal_id,b.disabled_at
      INTO resolved_principal,binding_disabled_at
      FROM founder_tenant_bindings b
      WHERE b.binding_id=p_binding_id
        AND b.identity_id=identity_row.identity_id /* W1_1_BINDING_ABSENT_GUARD */;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FOUNDER_BINDING_ABSENT' USING ERRCODE='42501';
    END IF;
    IF binding_disabled_at IS NOT NULL THEN
      RAISE EXCEPTION 'FOUNDER_BINDING_DISABLED' USING ERRCODE='42501';
    END IF;
    RETURN QUERY SELECT resolved_principal;
    RETURN;
  END IF;

  SELECT (array_agg(b.principal_id ORDER BY b.principal_id) FILTER (
           WHERE b.disabled_at IS NULL
         ))[1],
         count(*) FILTER (
           WHERE b.disabled_at IS NULL
         ),
         count(*)
    INTO resolved_principal,active_count,total_count
    FROM founder_tenant_bindings b
    WHERE b.identity_id=identity_row.identity_id;
  IF total_count=0 THEN
    RAISE EXCEPTION 'FOUNDER_BINDING_ABSENT' USING ERRCODE='42501';
  END IF;
  IF active_count=0 THEN
    RAISE EXCEPTION 'FOUNDER_BINDING_DISABLED' USING ERRCODE='42501';
  END IF;
  IF active_count>1 /* W1_1_BINDING_AMBIGUOUS_GUARD */ THEN
    RAISE EXCEPTION 'FOUNDER_BINDING_AMBIGUOUS' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT resolved_principal;
END $$;

REVOKE ALL ON founder_external_identities,founder_tenant_bindings,founding_authorizations
  FROM PUBLIC,engram_app,engram_maintenance;
REVOKE ALL ON FUNCTION resolve_founder_principal(text,text,uuid,uuid,uuid,uuid)
  FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION resolve_founder_principal(text,text,uuid,uuid,uuid,uuid)
  TO engram_maintenance;

COMMIT;
