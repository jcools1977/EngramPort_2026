\set ON_ERROR_STOP on
INSERT INTO tenants(id,slug,name) VALUES
 ('10000000-0000-0000-0000-000000000001','tenant-a','Tenant A'),
 ('20000000-0000-0000-0000-000000000002','tenant-b','Tenant B');
INSERT INTO principals(id,tenant_id,kind,external_issuer,external_subject,display_name) VALUES
 ('11000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','human','https://synthetic.invalid','tenant-a-owner','Principal A'),
 ('22000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','human','https://synthetic.invalid','tenant-b-owner','Principal B'),
 ('11000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','human','https://synthetic.invalid','tenant-a-disabled','Disabled A');
UPDATE principals SET disabled_at=now() WHERE id='11000000-0000-0000-0000-000000000099';
INSERT INTO projects(id,tenant_id,slug,name) VALUES
 ('12000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','project-a','Project A'),
 ('23000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','project-b','Project B');
INSERT INTO project_memberships(tenant_id,project_id,principal_id,role) VALUES
 ('10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','owner'),
 ('20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','owner');
INSERT INTO actors(id,tenant_id,project_id,kind,slug,display_name,trust) VALUES
 ('13000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','agent','agent-a','Agent A','trusted_agent'),
 ('13000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','agent','undelegated','Undelegated','trusted_agent'),
 ('24000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','agent','agent-b','Agent B','trusted_agent'),
 ('13000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','service','synthetic-custody-service','Synthetic Custody Service','trusted_service'),
 ('24000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','service','synthetic-custody-service','Synthetic Custody Service','trusted_service');
INSERT INTO actor_delegations(actor_id,principal_id,scopes) VALUES
 ('13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',ARRAY['events:append']),
 ('24000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002',ARRAY['events:append']),
 ('13000000-0000-0000-0000-000000000008','11000000-0000-0000-0000-000000000001',ARRAY['custody:mint:credential:3.2:B','custody:mint:credential:3.3:B','custody:mint:credential:3.12:A']),
 ('24000000-0000-0000-0000-000000000008','22000000-0000-0000-0000-000000000002',ARRAY['custody:mint:credential:3.3:B']);
INSERT INTO agent_sessions(id,tenant_id,project_id,actor_id,provider_session_ref,client_name,client_version) VALUES
 ('15000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000008','synthetic-d4-session-a','synthetic-custody-fixture','1'),
 ('25000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','24000000-0000-0000-0000-000000000008','synthetic-d4-session-b','synthetic-custody-fixture','1');
INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,
 correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash,labels) VALUES
 ('14000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',1,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),'14000000-0000-0000-0000-000000000001','seed-a','project','trusted_agent','{"title":"Alpha secret","body":"tenant alpha searchable"}','engramport-event-v1',decode(repeat('aa',32),'hex'),decode(repeat('ab',32),'hex'),ARRAY['alpha']),
 ('25000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002',1,1,'message.published','24000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002',now(),'25000000-0000-0000-0000-000000000002','seed-b','project','trusted_agent','{"title":"Beta secret","body":"tenant beta searchable"}','engramport-event-v1',decode(repeat('ba',32),'hex'),decode(repeat('bb',32),'hex'),ARRAY['beta']);
