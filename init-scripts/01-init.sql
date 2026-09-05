-- Schema Initialization for Secure Grant Management Portal

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create User Roles Join Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- 4. Create Grants Table
CREATE TABLE IF NOT EXISTS grants (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    grantor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    grant_id INTEGER NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    grantee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proposal TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_grants_grantor ON grants(grantor_id);
CREATE INDEX IF NOT EXISTS idx_applications_grant ON applications(grant_id);
CREATE INDEX IF NOT EXISTS idx_applications_grantee ON applications(grantee_id);

-- Insert Default Roles if they do not exist
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Full system administrator with user and role management privileges'),
    ('GRANTOR', 'Grant-making organization or individual able to create and manage grants'),
    ('GRANTEE', 'Funding applicant able to discover grants and submit applications')
ON CONFLICT (name) DO NOTHING;

-- Insert Default Admin User (Password: AdminSecurePassword123!)
-- bcrypt hash with salt rounds 10
INSERT INTO users (name, email, password_hash)
VALUES (
    'Super Admin',
    'admin@securegrant.org',
    '$2a$10$X8aIe7u4jDqF1eZ0b9fMre8GkWqLwzZkmV4L46nZvxoT6hUe1v64S'
)
ON CONFLICT (email) DO NOTHING;

-- Assign ADMIN role to default admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@securegrant.org' AND r.name = 'ADMIN'
ON CONFLICT DO NOTHING;
