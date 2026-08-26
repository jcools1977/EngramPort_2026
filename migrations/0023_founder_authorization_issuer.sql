BEGIN;

-- ADR 0038 step 3 deliberately stops short of external-identity enrollment.
-- This function can issue only the one-shot authorization state consumed by
-- resolve_founder_principal; it cannot write an issuer or subject claim.
CREATE FUNCTION issue_founding_authorization(
  p_authorization_id uuid,
  p_identity_id uuid,
  p_reserved_principal_id uuid,
  p_reserved_tenant_id uuid,
  p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
BEGIN
  IF p_expires_at<=clock_timestamp() THEN
    RAISE EXCEPTION 'FOUNDING_AUTHORIZATION_EXPIRY_REFUSED'
      USING ERRCODE='22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.founder_external_identities i
      WHERE i.identity_id=p_identity_id
        AND i.disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'FOUNDER_IDENTITY_INACTIVE'
      USING ERRCODE='42501';
  END IF;

  INSERT INTO public.founding_authorizations(
    authorization_id,
    identity_id,
    reserved_principal_id,
    reserved_tenant_id,
    expires_at
  ) VALUES (
    p_authorization_id,
    p_identity_id,
    p_reserved_principal_id,
    p_reserved_tenant_id,
    p_expires_at
  );

  RETURN p_authorization_id;
END $$;

REVOKE ALL ON FUNCTION issue_founding_authorization(uuid,uuid,uuid,uuid,timestamptz)
  FROM PUBLIC,engram_app,engram_maintenance;
GRANT EXECUTE ON FUNCTION issue_founding_authorization(uuid,uuid,uuid,uuid,timestamptz)
  TO engram_bootstrap_operator;

COMMIT;
