# USER_AUTH Table — Oracle SQL

Run this in your Oracle Cloud ATP (SQL Developer Web or SQLPlus).

```sql
CREATE TABLE user_auth (
    user_id        NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    staff_id       VARCHAR2(4)    NOT NULL UNIQUE,   -- 4-digit staff number e.g. '0012'
    full_name      VARCHAR2(100)  NOT NULL,
    email          VARCHAR2(150)  UNIQUE,
    password_hash  VARCHAR2(255)  NOT NULL,          -- bcrypt hashed
    role           VARCHAR2(20)   NOT NULL
                   CONSTRAINT chk_role CHECK (role IN ('admin','doctor','nurse','reception','pharmacist')),
    is_active      NUMBER(1)      DEFAULT 1 NOT NULL,
    created_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- No extra indexes needed: UNIQUE constraints on staff_id and email already create implicit indexes
```

## Seed Data (for testing)

> **IMPORTANT**: The password must be stored as a bcrypt hash, NOT plain text.  
> Run `node server/scripts/seed-admin.js` to insert a properly hashed admin user.  
> Or generate a hash manually: `node -e "require('bcryptjs').hash('admin123',10).then(console.log)"`

```sql
-- Password 'admin123' bcrypt hash (use the seed script instead for real usage)
INSERT INTO user_auth (staff_id, full_name, email, password_hash, role)
VALUES ('0001', 'System Admin', 'admin@carepulse.local', '$2b$10$tJ9X/uQQHgKse8XSBWhhm.HMRY/6dqMSu6iDvThziJzgXS1P4Kl4S', 'admin');

COMMIT;
```

## Columns

| Column | Type | Description |
|--------|------|-------------|
| user_id | NUMBER (auto) | Primary key |
| staff_id | VARCHAR2(4) | 4-digit staff number used for login |
| full_name | VARCHAR2(100) | Staff member's full name |
| email | VARCHAR2(150) | Optional email (also usable for login) |
| password_hash | VARCHAR2(255) | bcrypt hashed password |
| role | VARCHAR2(20) | One of: admin, doctor, nurse, reception, pharmacist |
| is_active | NUMBER(1) | 1 = active, 0 = disabled |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |
