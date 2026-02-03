

## Update Bharat DtoC Manager Role to Owner

This plan updates the association manager's role from `manager` to `owner` to enable saving logos and cover images.

---

### Current State

The Bharat DtoC association manager has:
- **Role**: `manager`
- **Permissions**: `null`

This does not satisfy the RLS policy requirement for updating association details.

---

### Solution

Run a database migration to update the manager's role:

```sql
UPDATE association_managers
SET role = 'owner'
WHERE association_id = (
  SELECT id FROM associations WHERE name = 'Bharat DtoC'
)
AND role = 'manager';
```

---

### What This Enables

After the update, the manager will be able to:
- Upload and save association logos
- Upload and save cover/background images
- Edit all association profile details

---

### Files to Modify

| Component | Change |
|-----------|--------|
| Database Migration | Update `association_managers.role` from `manager` to `owner` for Bharat DtoC |

---

### Technical Details

The RLS policy on `associations` table allows updates when:
```sql
association_managers.role = 'owner'
OR (permissions ->> 'edit_association')::boolean = true
```

By changing the role to `owner`, the manager will pass this policy check and be able to save image updates.

