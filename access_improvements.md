# BashaCare — Comprehensive Access & Security Improvements Plan

> **Version:** 2.0 (Expanded Technical Specification)  
> **Date:** July 26, 2026  
> **Scope:** 6 change areas across the full stack (Database → Backend → Frontend)  
> **Estimated Phases:** 4

---

## Executive Summary

This document provides a highly detailed, technical blueprint for overhauling BashaCare's **access control, authentication, and audit** systems. 

**Key Objectives:**
1. **Username-based authentication** replacing email-based login.
2. **Property Codes** scoped to each property, required for Manager/Tenant login.
3. **Module-wise role assignments** with dependency enforcement.
4. **Two-step login flow** (username/code → password validation).
5. **Impersonation** for Admins (acting as Landlords) and Landlords (acting as Managers).
6. **Enhanced activity logging** with full audit visibility.

---

## Reference Screenshots

The following screenshots from a reference application informed the UX design:

````carousel
![Login Step 1 — Login Name + Provider/Property Code](C:/Users/WaliulHasnatRahat/.gemini/antigravity-ide/brain/de9f9b6f-874f-4d64-9c5f-3fa64b26ec35/login_step1_ref.png)
<!-- slide -->
![Login Step 2 — Readonly fields + Password entry](C:/Users/WaliulHasnatRahat/.gemini/antigravity-ide/brain/de9f9b6f-874f-4d64-9c5f-3fa64b26ec35/login_step2_ref.png)
<!-- slide -->
![Module-wise Role Assignment — Checkbox-based categories](C:/Users/WaliulHasnatRahat/.gemini/antigravity-ide/brain/de9f9b6f-874f-4d64-9c5f-3fa64b26ec35/role_assignment_ref.png)
<!-- slide -->
![Admin Panel — User Privileges Management](C:/Users/WaliulHasnatRahat/.gemini/antigravity-ide/brain/de9f9b6f-874f-4d64-9c5f-3fa64b26ec35/admin_panel_ref.png)
````

---

## Phase 1: Database Schema & Authentication Foundation

> **Goal:** Introduce username and property code columns, create the manager-property assignment table, and convert the login flow.

### 1.1 Complete SQL Migration: `012_access_improvements.sql`

```sql
-- ============================================================
-- BashaCare Migration 012: Access & Auth Improvements
-- ============================================================

-- ─── 1. Add username to users table ──────────────────────────
ALTER TABLE users ADD COLUMN username VARCHAR(100);

-- Backfill existing users: Use the local part of the email as default username
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Relax email uniqueness to allow nulls (if desired for tenants/managers)
-- Optional based on business requirements:
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
-- CREATE UNIQUE INDEX idx_users_email_non_null ON users (email) WHERE email IS NOT NULL;

-- ─── 2. Add property_code to properties ──────────────────────
ALTER TABLE properties ADD COLUMN property_code VARCHAR(20);

-- Backfill existing properties with an 8-char uppercase hex code generated from their UUID
UPDATE properties 
SET property_code = UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 8))
WHERE property_code IS NULL;

ALTER TABLE properties ALTER COLUMN property_code SET NOT NULL;
CREATE UNIQUE INDEX idx_properties_code ON properties(property_code);

-- ─── 3. Manager ↔ Property assignment table ─────────────────
CREATE TABLE manager_property_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id  UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- RLS for manager assignments
ALTER TABLE manager_property_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY landlord_isolation_manager_assignments ON manager_property_assignments
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

CREATE INDEX idx_mpa_user ON manager_property_assignments(user_id);
CREATE INDEX idx_mpa_property ON manager_property_assignments(property_id);
CREATE INDEX idx_mpa_landlord ON manager_property_assignments(landlord_id);

-- ─── 4. Module Permissions Enum & Table ──────────────────────
CREATE TYPE module_permission AS ENUM (
  'PROPERTY_VIEW',
  'UNIT_MANAGER',
  'OCCUPANT_MANAGER',
  'AGREEMENT_MANAGER',
  'BILLING_MANAGER',
  'PAYMENT_MANAGER',
  'MAINTENANCE_MANAGER',
  'UTILITY_MANAGER',
  'REPORT_VIEWER',
  'ACTIVITY_VIEWER'
);

CREATE TABLE user_module_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id   UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  permission    module_permission NOT NULL,
  granted_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id, permission),
  -- Crucial dependency: Cascade delete permissions if manager is unassigned from property
  CONSTRAINT fk_ump_assignment FOREIGN KEY (user_id, property_id) 
    REFERENCES manager_property_assignments(user_id, property_id) ON DELETE CASCADE
);

-- RLS for permissions
ALTER TABLE user_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY landlord_isolation_permissions ON user_module_permissions
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

CREATE INDEX idx_ump_user ON user_module_permissions(user_id);
CREATE INDEX idx_ump_property ON user_module_permissions(property_id);

-- ─── 5. Extend Activity Logs for Impersonation ───────────────
ALTER TABLE activity_logs ADD COLUMN username VARCHAR(100);
ALTER TABLE activity_logs ADD COLUMN property_id UUID REFERENCES properties(id);
ALTER TABLE activity_logs ADD COLUMN property_code VARCHAR(20);
ALTER TABLE activity_logs ADD COLUMN ip_address INET;
ALTER TABLE activity_logs ADD COLUMN user_agent TEXT;
ALTER TABLE activity_logs ADD COLUMN session_id UUID;
ALTER TABLE activity_logs ADD COLUMN impersonator_id UUID REFERENCES users(id);
ALTER TABLE activity_logs ADD COLUMN impersonation_context JSONB;

CREATE INDEX idx_activity_logs_impersonator ON activity_logs(impersonator_id);
```

### 1.2 Two-Step Authentication API (`backend/src/routes/auth.js`)

**Endpoint 1: `POST /api/v1/auth/login/validate-user`**
Identifies the user based on role scoping.

*Request:*
```json
{
  "username": "rahat",
  "property_code": "SQA-TH" // Required for manager/tenant, ignored for admin/landlord
}
```

*Implementation Logic:*
```javascript
fastify.post('/login/validate-user', async (request, reply) => {
  const { username, property_code } = request.body;

  let query = `
    SELECT u.id, u.role, u.full_name, lp.company_name
    FROM users u
    LEFT JOIN landlord_profiles lp ON lp.id = u.landlord_id
  `;
  const params = [username];

  if (property_code) {
    // Manager or Tenant path
    query += `
      LEFT JOIN manager_property_assignments mpa ON mpa.user_id = u.id
      LEFT JOIN properties p ON p.id = mpa.property_id
      WHERE u.username = $1 AND p.property_code = $2 AND u.is_active = TRUE
    `;
    params.push(property_code);
  } else {
    // Admin or Landlord path
    query += `
      WHERE u.username = $1 AND u.role IN ('admin', 'landlord') AND u.is_active = TRUE
    `;
  }

  const result = await queryAdmin(query, params);
  if (result.rows.length === 0) {
    return reply.code(404).send({ error: 'User not found or inactive' });
  }

  return { 
    user_exists: true, 
    role: result.rows[0].role, 
    display_name: result.rows[0].full_name || username,
    company_name: result.rows[0].company_name
  };
});
```

**Endpoint 2: `POST /api/v1/auth/login`**
Verifies password and issues JWT.

*Request:*
```json
{
  "username": "rahat",
  "password": "securepassword123",
  "property_code": "SQA-TH" 
}
```

*Implementation Details:*
- Password is checked using `bcrypt.compare`.
- A complex query retrieves assigned properties and module permissions if the user is a manager.
- JWT Payload gets constructed:
```javascript
const token = fastify.jwt.sign({
  id: user.id,
  landlord_id: user.landlord_id,
  role: user.role,
  username: user.username,
  property_id: user.property_id, // If logged in via property_code
  property_code: property_code || null,
  module_permissions: user.permissions || [], // Array of ENUM strings
  is_impersonating: false,
  impersonator_id: null
});
```

### 1.3 Frontend Zustand State (`authStore.js`)

```javascript
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,          // { id, role, username, full_name, company_name }
      token: null,
      isAuthenticated: false,
      propertyCode: null,  // Current scoped property code
      propertyId: null,    // Current scoped property id
      permissions: [],     // Array of strings: ['UNIT_MANAGER', ...]
      impersonation: { active: false, originalToken: null },

      // Actions
      validateUser: async (username, propertyCode) => {
        const { data } = await api.post('/auth/login/validate-user', { username, property_code: propertyCode });
        return data;
      },
      
      login: async (username, password, propertyCode) => {
        const { data } = await api.post('/auth/login', { username, password, property_code: propertyCode });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        
        // Decode JWT to extract specific fields
        const decoded = jwtDecode(data.token);
        
        set({ 
          user: data.user, 
          token: data.token, 
          isAuthenticated: true,
          propertyCode: decoded.property_code,
          propertyId: decoded.property_id,
          permissions: decoded.module_permissions || [],
          impersonation: { active: decoded.is_impersonating, originalToken: get().token }
        });
        return data.user;
      },

      hasPermission: (requiredPerm) => {
        const { user, permissions } = get();
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'landlord') return true;
        return permissions.includes(requiredPerm);
      },
      // ... existing actions
    })
  )
);
```

---

## Phase 2: Module-wise Roles & Granular Permissions

> **Goal:** Create backend guards and database wrappers to strictly enforce module access, and build the assignment UI.

### 2.1 Backend Middleware (`backend/src/plugins/permissions.js`)

```javascript
import fp from 'fastify-plugin';

export default fp(async function (fastify, opts) {
  fastify.decorate('requireModulePermission', (requiredPermission) => {
    return async (request, reply) => {
      // Must be called after fastify.authenticate
      const user = request.user;
      
      // Admins and Landlords have implicit full access
      if (user.role === 'admin' || user.role === 'landlord') {
        return;
      }

      // Tenants are blocked from these routes entirely
      if (user.role === 'tenant') {
        return reply.code(403).send({ error: 'Tenant access forbidden' });
      }

      // Check manager permissions embedded in JWT
      if (user.role === 'manager') {
        if (!user.module_permissions || !user.module_permissions.includes(requiredPermission)) {
          return reply.code(403).send({ 
            error: 'Forbidden', 
            message: `Missing required module permission: ${requiredPermission}` 
          });
        }
      }
    };
  });
});
```

### 2.2 Strict Database Wrapper for Managers (`database.js`)

When a manager queries data, they should only see data for properties they are assigned to.

```javascript
/**
 * Execute query with RLS context AND property scoping for managers.
 * @param {Object} user - Decoded JWT payload
 * @param {string} query - Base SQL query
 * @param {Array} params - Query parameters
 */
export async function queryWithScope(user, query, params = []) {
  if (!user.landlord_id) throw new Error('Invalid landlord_id');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE bashacare_rls_user;');
    await client.query(`SET LOCAL app.current_landlord_id = '${user.landlord_id}';`);

    // If user is a manager, dynamically wrap the query to enforce property isolation
    let finalQuery = query;
    if (user.role === 'manager') {
      // Assuming the base query has a property_id column available
      // This is a naive implementation; complex queries may require explicit WHERE clauses in the route
      finalQuery = `
        WITH base_query AS (${query})
        SELECT * FROM base_query
        WHERE property_id IN (
          SELECT property_id FROM manager_property_assignments WHERE user_id = '${user.id}'
        )
      `;
    }

    const result = await client.query(finalQuery, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

*Note:* A better approach for specific endpoints (like `GET /units`) is to inject the property ID check directly into the route's SQL if the user is a manager.

### 2.3 API Endpoints for Role Management (`managers.js`)

**`PATCH /api/v1/managers/:userId/permissions`**
Bulk updates permissions for a manager.

*Request Body:*
```json
{
  "property_id": "uuid-of-property",
  "permissions": ["PROPERTY_VIEW", "UNIT_MANAGER", "BILLING_MANAGER"]
}
```

*Implementation:*
```javascript
// 1. Delete existing permissions for this user + property
await queryWithRLS(landlordId, `DELETE FROM user_module_permissions WHERE user_id = $1 AND property_id = $2`, [userId, propertyId]);

// 2. Insert new permissions using UNNEST for batch insert
if (permissions.length > 0) {
  await queryWithRLS(landlordId, `
    INSERT INTO user_module_permissions (landlord_id, user_id, property_id, permission, granted_by)
    SELECT $1, $2, $3, unnest($4::module_permission[]), $5
  `, [landlordId, userId, propertyId, permissions, req.user.id]);
}
```

### 2.4 Role Assignment Frontend UI (`ManagerRoles.jsx`)

The React component will utilize a matrix structure. 

```jsx
const PERMISSION_CATEGORIES = {
  PropertyAccess: [{ key: 'PROPERTY_VIEW', label: 'View Property Dashboard' }],
  ModuleRoles: [
    { key: 'UNIT_MANAGER', label: 'Unit Manager' },
    { key: 'OCCUPANT_MANAGER', label: 'Occupant Manager' },
    { key: 'AGREEMENT_MANAGER', label: 'Agreement Manager' },
    { key: 'BILLING_MANAGER', label: 'Billing Manager' },
    { key: 'PAYMENT_MANAGER', label: 'Payment Manager' },
    { key: 'MAINTENANCE_MANAGER', label: 'Maintenance Manager' },
    { key: 'UTILITY_MANAGER', label: 'Utility Manager' }
  ],
  Reports: [
    { key: 'REPORT_VIEWER', label: 'Report Viewer' },
    { key: 'ACTIVITY_VIEWER', label: 'Activity Viewer' }
  ]
};
```
- Map through these categories to render 3 columns of checkboxes.
- Store selected permissions in local state: `const [selected, setSelected] = useState(initialPerms)`.
- Submit changes via `PATCH` to the API.

---

## Phase 3: Impersonation System

> **Goal:** Enable Admins to act as Landlords, and Landlords to act as Managers, tracking all actions.

### 3.1 Backend Impersonation API (`impersonation.js`)

**`POST /api/v1/impersonate/start`**

```javascript
fastify.post('/start', { preHandler: [fastify.authenticate] }, async (req, reply) => {
  const { target_user_id, property_code } = req.body;
  const originalUser = req.user;

  // Validate target user exists
  const targetQuery = await queryAdmin(`SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [target_user_id]);
  if (!targetQuery.rows[0]) return reply.code(404).send({ error: 'Target user not found' });
  const targetUser = targetQuery.rows[0];

  // Logic checks
  if (originalUser.role === 'admin') {
    if (targetUser.role !== 'landlord') return reply.code(403).send({ error: 'Admins can only impersonate landlords' });
  } else if (originalUser.role === 'landlord') {
    if (targetUser.role !== 'manager' || targetUser.landlord_id !== originalUser.landlord_id) {
      return reply.code(403).send({ error: 'Landlords can only impersonate their own managers' });
    }
  } else {
    return reply.code(403).send({ error: 'Role not authorized for impersonation' });
  }

  // Fetch permissions if target is manager
  let permissions = [];
  let propertyId = null;
  if (targetUser.role === 'manager' && property_code) {
      // fetch property_id and permissions
      const pData = await queryAdmin(`SELECT id FROM properties WHERE property_code = $1`, [property_code]);
      propertyId = pData.rows[0].id;
      const permData = await queryAdmin(`SELECT permission FROM user_module_permissions WHERE user_id = $1 AND property_id = $2`, [targetUser.id, propertyId]);
      permissions = permData.rows.map(r => r.permission);
  }

  // Generate new Impersonation JWT
  const token = fastify.jwt.sign({
    id: targetUser.id,
    landlord_id: targetUser.landlord_id,
    role: targetUser.role,
    username: targetUser.username,
    property_id: propertyId,
    property_code: property_code || null,
    module_permissions: permissions,
    
    // Impersonation Metadata
    is_impersonating: true,
    impersonator_id: originalUser.id,
    impersonator_role: originalUser.role
  });

  return { token, message: `Now impersonating ${targetUser.username}` };
});
```

### 3.2 Audit Logging Helper Update

Update the internal utility that logs activity so it detects impersonation:

```javascript
export async function logActivity(client, req, entityType, action, description, entityId = null) {
  const landlordId = req.user.landlord_id;
  
  // Real actor could be the impersonator
  const actualUserId = req.user.is_impersonating ? req.user.impersonator_id : req.user.id;
  const impersonatorId = req.user.is_impersonating ? req.user.impersonator_id : null;
  
  const ctx = req.user.is_impersonating ? {
    impersonator_role: req.user.impersonator_role,
    target_role: req.user.role,
    target_username: req.user.username
  } : null;

  await client.query(`
    INSERT INTO activity_logs (
      landlord_id, user_id, impersonator_id, entity_type, entity_id, 
      action, description, username, property_id, property_code, impersonation_context
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    landlordId, actualUserId, impersonatorId, entityType, entityId, 
    action, description, req.user.username, req.user.property_id, req.user.property_code, ctx
  ]);
}
```

---

## Phase 4: Enhanced Activity Logging & User Creation Flows

> **Goal:** Create the Admin-wide Activity Log viewer and finalize Manager/Tenant creation APIs.

### 4.1 Admin Activity Log (`backend/src/routes/activity.js`)

**`GET /api/v1/activity-logs/admin/all`**

```javascript
fastify.get('/admin/all', { preHandler: [fastify.authenticate] }, async (req, reply) => {
  if (req.user.role !== 'admin') return reply.code(403).send();

  const { limit = 100, offset = 0, entity_type, action, landlord_id } = req.query;
  
  let query = `
    SELECT a.*, 
           u.full_name AS user_name, u.role AS user_role,
           imp.full_name AS impersonator_name,
           lp.company_name,
           p.name AS property_name
    FROM activity_logs a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN users imp ON imp.id = a.impersonator_id
    LEFT JOIN landlord_profiles lp ON lp.id = a.landlord_id
    LEFT JOIN properties p ON p.id = a.property_id
    WHERE 1=1
  `;
  const params = [];
  
  if (entity_type) { params.push(entity_type); query += ` AND a.entity_type = $${params.length}`; }
  if (action) { params.push(action); query += ` AND a.action = $${params.length}`; }
  if (landlord_id) { params.push(landlord_id); query += ` AND a.landlord_id = $${params.length}`; }

  query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await queryAdmin(query, params);
  return result.rows;
});
```

### 4.2 Frontend Admin Log Table (`AdminActivityLog.jsx`)

Use a `.data-table` layout with these columns:
- **Time**: Formatted local time
- **Actor**: `user_name` (If impersonated, show: ⚠️ `impersonator_name` as `user_name`)
- **Company**: `company_name`
- **Entity**: `entity_type` badge
- **Action**: `action` badge (e.g., green for CREATED, red for DELETED)
- **Description**: `description` text

### 4.3 Tenant Creation Scoping in `occupants.js`

When a Manager creates a Tenant, verify property assignment:

```javascript
fastify.post('/', { preHandler: [fastify.authenticate, fastify.requireModulePermission('OCCUPANT_MANAGER')] }, async (req, reply) => {
  const { property_id, ...tenantData } = req.body;
  
  if (req.user.role === 'manager') {
    // Verify assignment
    const check = await queryAdmin(`
      SELECT 1 FROM manager_property_assignments 
      WHERE user_id = $1 AND property_id = $2
    `, [req.user.id, property_id]);
    
    if (check.rows.length === 0) {
      return reply.code(403).send({ error: 'You are not assigned to manage this property.' });
    }
  }
  
  // Proceed with tenant creation...
});
```

---

## Testing Strategy

1. **Unit Tests (Backend):** 
   - Verify `validate-user` fails for bad username.
   - Verify manager cannot login without a valid `property_code`.
   - Verify `requireModulePermission` blocks requests for managers missing the enum flag.
2. **Integration Tests:**
   - Execute the impersonation flow: Admin requests token -> Decoded token shows `is_impersonating=true` -> Activity log insertion shows `impersonator_id`.
3. **Frontend E2E:**
   - Walk through step 1 (enter username + code) -> verify step 2 fields are disabled -> enter password -> verify redirect to correct dashboard.

---

> [!TIP]
> Begin execution sequentially starting with Phase 1. The database migrations and auth flow changes provide the foundation required for all subsequent features.
