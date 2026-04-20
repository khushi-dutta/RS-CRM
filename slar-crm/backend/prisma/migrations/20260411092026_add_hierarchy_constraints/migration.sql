-- Add check constraint for maximum hierarchy depth (REQ-1.1.5)
ALTER TABLE team_hierarchy 
ADD CONSTRAINT chk_max_hierarchy_depth 
CHECK (level >= 0 AND level <= 10);

-- Add check constraint to prevent self-supervision (REQ-1.1.3)
ALTER TABLE team_hierarchy 
ADD CONSTRAINT chk_no_self_supervision 
CHECK ("userId" != "supervisorId");

-- Add constraint to ensure path format is correct
ALTER TABLE team_hierarchy 
ADD CONSTRAINT chk_path_format 
CHECK (path ~ '^(/[0-9a-f-]+)*/$');