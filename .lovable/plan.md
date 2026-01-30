

## Coupon Management System for Event Landing Pages

This feature will allow Super Admins to create and manage discount coupons that can be applied during event registration on landing pages.

---

### Overview

The coupon system will enable:
- Creating discount coupons with codes, percentage or fixed discounts
- Associating coupons with specific landing pages or making them global
- Setting validity periods and usage limits
- Tracking coupon usage statistics
- Applying coupons during event registration

---

### Coupon Properties

| Property | Description |
|----------|-------------|
| **Code** | Unique alphanumeric code (e.g., "EARLY20", "VIP50") |
| **Name/Description** | Internal name for easy identification |
| **Discount Type** | Percentage (%) or Fixed Amount |
| **Discount Value** | The discount amount (e.g., 20 for 20% or 500 for a fixed amount) |
| **Landing Page(s)** | Specific landing page(s) or "All" for global coupons |
| **Valid From** | Start date of coupon validity |
| **Valid Until** | Expiry date of the coupon |
| **Max Uses** | Maximum total uses (optional, null for unlimited) |
| **Max Uses Per User** | Limit per email address (default: 1) |
| **Minimum Registration** | Minimum value requirement if applicable |
| **Is Active** | Toggle to enable/disable the coupon |
| **Created By** | Admin who created the coupon |

---

### User Experience Flow

**Admin Side:**
1. Navigate to Admin > Coupon Management
2. Create new coupon with all parameters
3. View list of all coupons with usage stats
4. Edit or deactivate coupons as needed

**Visitor Side (Event Registration):**
1. Fill out registration form on landing page
2. Enter optional coupon code field
3. System validates coupon and shows discount preview
4. Submit registration with discount applied

---

### Database Schema

**New Table: `event_coupons`**

```text
+----------------------+-------------------------+----------------------------------+
| Column               | Type                    | Description                      |
+----------------------+-------------------------+----------------------------------+
| id                   | UUID (PK)               | Primary key                      |
| code                 | TEXT (UNIQUE)           | Coupon code (uppercase)          |
| name                 | TEXT                    | Internal name/description        |
| discount_type        | TEXT                    | 'percentage' or 'fixed'          |
| discount_value       | DECIMAL                 | Discount amount                  |
| landing_page_id      | UUID (FK, nullable)     | Specific page or NULL for all    |
| valid_from           | TIMESTAMPTZ             | Start date                       |
| valid_until          | TIMESTAMPTZ             | Expiry date                      |
| max_uses             | INTEGER (nullable)      | Max total uses (null=unlimited)  |
| max_uses_per_user    | INTEGER                 | Per email limit (default: 1)     |
| current_uses         | INTEGER                 | Current usage count              |
| is_active            | BOOLEAN                 | Active status                    |
| created_by           | UUID (FK)               | Creator admin                    |
| created_at           | TIMESTAMPTZ             | Creation timestamp               |
| updated_at           | TIMESTAMPTZ             | Last update timestamp            |
+----------------------+-------------------------+----------------------------------+
```

**New Table: `event_coupon_usages`**

```text
+----------------------+-------------------------+----------------------------------+
| Column               | Type                    | Description                      |
+----------------------+-------------------------+----------------------------------+
| id                   | UUID (PK)               | Primary key                      |
| coupon_id            | UUID (FK)               | Reference to coupon              |
| registration_id      | UUID (FK)               | Reference to registration        |
| email                | TEXT                    | Email that used the coupon       |
| discount_applied     | DECIMAL                 | Actual discount amount           |
| used_at              | TIMESTAMPTZ             | Usage timestamp                  |
+----------------------+-------------------------+----------------------------------+
```

**Update: `event_registrations` table**

Add columns:
- `coupon_id` (UUID, nullable) - Reference to applied coupon
- `discount_amount` (DECIMAL, default 0) - Amount discounted
- `original_amount` (DECIMAL, nullable) - Original price before discount
- `final_amount` (DECIMAL, nullable) - Final price after discount

---

### File Changes Summary

| Area | Files | Changes |
|------|-------|---------|
| Database | Migration file | Create tables, RLS policies, triggers |
| Admin UI | `CouponManagement.tsx` (new) | List, create, edit coupons |
| Admin UI | `CreateCouponDialog.tsx` (new) | Create/edit coupon form |
| Routes | `App.tsx` | Add coupon management route |
| Edge Function | `validate-coupon/index.ts` (new) | Validate coupon codes |
| Edge Function | `process-event-registration/index.ts` | Add coupon support |
| Public View | `EventLandingPageView.tsx` | Pass coupon data to form |

---

### Technical Implementation

**1. Database Migration**

```sql
-- Create coupons table
CREATE TABLE public.event_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  landing_page_id UUID REFERENCES public.event_landing_pages(id) ON DELETE CASCADE,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER,
  max_uses_per_user INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create usage tracking table
CREATE TABLE public.event_coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.event_coupons(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add coupon fields to registrations
ALTER TABLE public.event_registrations 
ADD COLUMN coupon_id UUID REFERENCES public.event_coupons(id),
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN original_amount DECIMAL(10,2),
ADD COLUMN final_amount DECIMAL(10,2);

-- Enable RLS
ALTER TABLE public.event_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_coupon_usages ENABLE ROW LEVEL SECURITY;

-- Super Admin policies
CREATE POLICY "Super admins can manage coupons"
  ON public.event_coupons FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view coupon usages"
  ON public.event_coupon_usages FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Trigger to update current_uses count
CREATE OR REPLACE FUNCTION update_coupon_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.event_coupons 
  SET current_uses = current_uses + 1 
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER increment_coupon_usage
AFTER INSERT ON public.event_coupon_usages
FOR EACH ROW EXECUTE FUNCTION update_coupon_usage_count();
```

**2. Validate Coupon Edge Function**

The function will:
- Check if code exists and is active
- Verify date validity (between valid_from and valid_until)
- Check landing page applicability
- Verify usage limits (total and per-user)
- Return discount details or error

**3. Admin Coupon Management UI**

The page will display:
- Table of all coupons with code, discount, validity, usage stats
- Create button opening a dialog/form
- Edit and deactivate actions
- Filter by status (active/expired/all)
- Search by code

**4. Registration Flow Update**

When a coupon code is submitted:
- Call validate-coupon edge function
- Show discount preview to user
- Include coupon_id in registration submission
- Record usage in coupon_usages table
- Update registration with discount info

---

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/validate-coupon` | POST | Validate coupon code and return discount info |
| `/process-event-registration` | POST | Updated to accept and apply coupon |

---

### Security Considerations

- Coupon codes are case-insensitive (stored uppercase)
- Rate limiting on validation endpoint to prevent brute force
- Usage tracked by email to prevent abuse
- Only Super Admins can create/manage coupons
- RLS policies ensure proper access control

