

## Event Registrations Report - Implementation Plan

This plan adds a "View Registrations" button to each landing page card and creates a dedicated page to view, filter, and export all registration details.

---

### What Will Be Built

| Feature | Description |
|---------|-------------|
| **View Registrations Button** | New button on each landing page card to access registrations |
| **Registrations Detail Page** | New page showing all registrations for a specific event |
| **Data Table** | Table with name, email, phone, status, date, and custom form data |
| **CSV Export** | Download registrations as a spreadsheet |
| **Search & Filter** | Find registrations by name or email |

---

### UI Preview

The landing page card will get a new button:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Bharat DtoC 2026  [Active]                              [Toggle]│
│ Association: Bharat DtoC   Created: Jan 27, 2026                │
│                                                                 │
│ /event/bharat-dtoc-2026   👥 5 registrations   [Registration Open]│
│                                                                 │
│ [Preview] [Copy URL] [Open] [View Registrations] [Edit] [Delete]│
└─────────────────────────────────────────────────────────────────┘
```

The registrations page will show:

```text
┌─────────────────────────────────────────────────────────────────┐
│ ← Back   Registrations: Bharat DtoC 2026                        │
│ 5 total registrations                            [Export CSV]   │
├─────────────────────────────────────────────────────────────────┤
│ [Search by name or email...]                                    │
├──────┬──────────────┬────────────────────┬────────┬─────────────┤
│ Name │ Email        │ Phone              │ Status │ Registered  │
├──────┼──────────────┼────────────────────┼────────┼─────────────┤
│ John │ john@ex.com  │ +91 9876543210     │ ✓ Done │ Feb 1, 2026 │
│ Jane │ jane@ex.com  │ +91 8765432109     │ ✓ Done │ Feb 2, 2026 │
└──────┴──────────────┴────────────────────┴────────┴─────────────┘
│ [View Details] - Shows all custom form fields in a dialog      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/admin/EventRegistrations.tsx` | **Create** | New page showing registration details |
| `src/pages/admin/EventLandingPages.tsx` | **Modify** | Add "View Registrations" button |
| `src/App.tsx` | **Modify** | Add route for new registrations page |

---

### Technical Details

**1. New Route**
- Path: `/admin/event-landing-pages/:id/registrations`
- Protected route requiring authentication

**2. EventRegistrations.tsx Features**
- Fetch registrations filtered by `landing_page_id`
- Display in a table with columns: Name, Email, Phone, Status, Registered Date
- Search input to filter by name/email
- "View Details" button to show full `registration_data` JSON in a dialog
- CSV export button using browser download

**3. EventLandingPages.tsx Changes**
- Add new "View Registrations" button after "Open" button
- Button navigates to `/admin/event-landing-pages/{id}/registrations`
- Uses `ClipboardList` icon from lucide-react

**4. CSV Export Logic**
- Flatten `registration_data` JSONB into columns
- Include standard fields: first_name, last_name, email, phone, status, created_at
- Merge custom form fields from registration_data

