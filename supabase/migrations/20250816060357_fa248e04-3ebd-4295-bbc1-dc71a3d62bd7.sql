-- Grant super_admin role to phone account
INSERT INTO user_roles (user_id, role, created_by)
VALUES (
  '8a9fdb15-866c-421b-82eb-85c29a46b81e', 
  'super_admin'::app_role, 
  'e40ec137-0171-433c-818c-a02429539838'
);