\set ON_ERROR_STOP on
INSERT INTO tenants(id,slug,name) VALUES
 ('10000000-0000-0000-0000-000000000001','tenant-a','Tenant A'),
 ('20000000-0000-0000-0000-000000000002','tenant-b','Tenant B');
INSERT INTO principals(id,tenant_id,kind,display_name) VALUES
 ('11000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','human','Principal A'),
 ('22000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','human','Principal B'),
 ('11000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','human','Disabled A');
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
 ('24000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002','agent','agent-b','Agent B','trusted_agent');
INSERT INTO actor_delegations(actor_id,principal_id,scopes) VALUES
 ('13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',ARRAY['events:append']),
 ('24000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002',ARRAY['events:append']);
INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,
 correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash,labels) VALUES
 ('14000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',1,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),'14000000-0000-0000-0000-000000000001','seed-a','project','trusted_agent','{"title":"Alpha secret","body":"tenant alpha searchable"}','engramport-event-v1',decode(repeat('aa',32),'hex'),decode(repeat('ab',32),'hex'),ARRAY['alpha']),
 ('25000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002',1,1,'message.published','24000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002',now(),'25000000-0000-0000-0000-000000000002','seed-b','project','trusted_agent','{"title":"Beta secret","body":"tenant beta searchable"}','engramport-event-v1',decode(repeat('ba',32),'hex'),decode(repeat('bb',32),'hex'),ARRAY['beta']);
