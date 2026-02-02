

## Registration Email Template Redesign - Complete Plan

This plan updates the event registration confirmation email to match the BharatD2C template format.

---

### Variables & Values Summary

| Variable | Source | Status |
|----------|--------|--------|
| First Name | `first_name` from registration | ✅ Available |
| Event Title | `landingPage.title` from database | ✅ Available |
| Event Date | New column `event_date` | ❌ Needs to be added |
| Event Time | New column `event_time` | ❌ Needs to be added |
| Event Venue | New column `event_venue` | ❌ Needs to be added |
| Portal URL | `https://smb-connect-hub.lovable.app/auth/login` | ✅ Hardcoded |
| Username | `email` from registration | ✅ Available |
| Temporary Password | `password` generated at registration | ✅ Available |

---

### Implementation Steps

**Step 1: Database Migration**

Add three new columns to store event details:

```sql
ALTER TABLE event_landing_pages
ADD COLUMN event_date DATE,
ADD COLUMN event_time TEXT,
ADD COLUMN event_venue TEXT;
```

**Step 2: Update Bharat DtoC Page with Event Details**

```sql
UPDATE event_landing_pages 
SET 
  event_date = '2026-02-20',
  event_time = '10:00 AM – 2:30 PM',
  event_venue = 'Bangalore (venue TBC)'
WHERE slug = 'bharat-dtoc-2026';
```

---

**Step 3: Update Edge Function Email Template**

Modify `supabase/functions/process-event-registration/index.ts`:

1. Fetch the new columns from database
2. Format the date as "20 February 2026"
3. Replace the email HTML with the new template structure:

```text
Subject: Welcome to {Event Title} & Your SMBConnect Portal Access

Dear {First Name},

Thank you for registering for {Event Title}! We're excited to have you 
join the vibrant ecosystem of D2C founders, brand leaders, investors, 
and industry enablers.

This registration also gives you exclusive access to the SMBConnect Portal...

📌 EVENT DETAILS
┌────────────┬─────────────────────────────────────┐
│ Event      │ {Event Title}                       │
│ Date       │ {Event Date}                        │
│ Time       │ {Event Time}                        │
│ Venue      │ {Event Venue}                       │
└────────────┴─────────────────────────────────────┘

🌐 YOUR SMBCONNECT PORTAL ACCESS
┌────────────────────┬────────────────────────────┐
│ Portal URL         │ {Login URL}                │
│ Username           │ {Email}                    │
│ Temporary Password │ {Password}                 │
└────────────────────┴────────────────────────────┘

WHAT YOU CAN DO ON SMBCONNECT:
✓ Connect with founders, investors, and business leaders
✓ Stay updated on events, awards, and exhibitions
✓ Access exclusive reports and industry insights

Warm regards,
SMBConnect
```

---

**Step 4: Update Admin Form (Optional Enhancement)**

Modify `src/pages/admin/CreateLandingPage.tsx` to add input fields for:
- Event Date (date picker)
- Event Time (text input)
- Event Venue (textarea)

This allows admins to set these details when creating/editing landing pages.

---

### Files to Modify

| File | Changes |
|------|---------|
| Database | Add `event_date`, `event_time`, `event_venue` columns |
| `supabase/functions/process-event-registration/index.ts` | Replace email template with new design |
| `src/pages/admin/CreateLandingPage.tsx` | Add form fields for event details |

---

### New Email Subject Line

| Current | New |
|---------|-----|
| "Welcome to SMB Connect - Your Event Registration is Complete!" | "Welcome to {Event Title} & Your SMBConnect Portal Access" |

---

### Technical Notes

- Date formatting: Will use JavaScript to format the date (e.g., `new Date(event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })`)
- If event details are not set, the email will show "Details to be announced"
- Email uses inline CSS for maximum email client compatibility
- The template will work for all events, dynamically pulling the event-specific details

