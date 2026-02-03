

## Add UTM Source Tracking to Event Registrations Report

This plan adds UTM tracking columns to the database and displays the registration source in the admin report.

---

### Current State

- UTM parameters are passed via URL (e.g., `?utm_source=telecalling&utm_medium=phone`)
- The `event_registrations` table does NOT have UTM columns
- UTM data is not being captured or stored

---

### Implementation Steps

**Step 1: Database Migration**

Add three UTM tracking columns to the `event_registrations` table:

```sql
ALTER TABLE event_registrations
ADD COLUMN utm_source TEXT,
ADD COLUMN utm_medium TEXT,
ADD COLUMN utm_campaign TEXT;
```

---

**Step 2: Update Frontend to Capture UTM Parameters**

Modify `src/pages/public/EventLandingPageView.tsx` to:
1. Extract UTM parameters from the URL when page loads
2. Include UTM parameters in the registration request

```text
// Capture UTM params from URL
const urlParams = new URLSearchParams(window.location.search);
const utmSource = urlParams.get('utm_source');
const utmMedium = urlParams.get('utm_medium');
const utmCampaign = urlParams.get('utm_campaign');

// Add to registration request
const requestBody = {
  ...existingFields,
  utm_source: utmSource,
  utm_medium: utmMedium,
  utm_campaign: utmCampaign
};
```

---

**Step 3: Update Edge Function**

Modify `supabase/functions/process-event-registration/index.ts` to:
1. Accept UTM parameters in the request body
2. Store UTM parameters in the database

```text
interface RegistrationRequest {
  // ...existing fields
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// Insert with UTM data
const { data: registration } = await supabase
  .from('event_registrations')
  .insert({
    // ...existing fields
    utm_source: body.utm_source || null,
    utm_medium: body.utm_medium || null,
    utm_campaign: body.utm_campaign || null
  });
```

---

**Step 4: Update Registration Report**

Modify `src/pages/admin/EventRegistrations.tsx` to:
1. Add `utm_source` to the query
2. Add a "Source" column to the table
3. Include UTM data in the CSV export

---

### Updated Table Display

| Name | Email | Phone | Source | Coupon | Amount | Status | Registered |
|------|-------|-------|--------|--------|--------|--------|------------|
| John Doe | john@example.com | 9876543210 | **telecalling** | DTOC100 | ₹500 | Completed | Feb 3, 2026 |
| Jane Smith | jane@example.com | 8765432109 | **smita** | - | ₹600 | Completed | Feb 2, 2026 |

The source column will show values like:
- `telecalling` (from phone calls)
- `social` (from social media)
- `paid` (from ads)
- `smita` / `rajeev` (personal referrals)
- `internal` (internal team)
- `-` (no UTM tracking)

---

### Files to Modify

| File | Changes |
|------|---------|
| Database | Add `utm_source`, `utm_medium`, `utm_campaign` columns |
| `src/pages/public/EventLandingPageView.tsx` | Capture UTM params from URL and pass to registration |
| `supabase/functions/process-event-registration/index.ts` | Accept and store UTM parameters |
| `src/pages/admin/EventRegistrations.tsx` | Display Source column and include in CSV export |

---

### Registration Details Dialog Enhancement

The details popup will also show UTM tracking info:

```text
📊 TRACKING INFO
┌────────────┬─────────────────┐
│ Source     │ telecalling     │
│ Medium     │ phone           │
│ Campaign   │ bharat-dtoc-2026│
└────────────┴─────────────────┘
```

---

### CSV Export

The exported CSV will include new columns:
- `UTM Source`
- `UTM Medium`
- `UTM Campaign`

