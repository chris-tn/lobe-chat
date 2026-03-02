-- SQL Script to fix admin access
-- Connect to your database and run this query

-- Update the user to have admin privileges
UPDATE users 
SET is_admin = true 
WHERE id = 'f659efd8-7420-4c7e-9f3e-30cc7818b19b';

-- Verify the change
SELECT 
    id, 
    email, 
    full_name, 
    is_admin,
    created_at,
    updated_at
FROM users 
WHERE id = 'f659efd8-7420-4c7e-9f3e-30cc7818b19b';

-- Optional: List all admin users
SELECT id, email, full_name, is_admin 
FROM users 
WHERE is_admin = true;









