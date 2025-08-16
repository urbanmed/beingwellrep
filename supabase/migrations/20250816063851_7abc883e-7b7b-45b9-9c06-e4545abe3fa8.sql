-- Enable leaked password protection for enhanced security
-- This protects against users using passwords that have been compromised in data breaches
INSERT INTO auth.config (parameter, value) 
VALUES ('security_password_strength', 'true')
ON CONFLICT (parameter) 
DO UPDATE SET value = 'true';