

## Event Landing Pages with Automatic User Registration

This feature will allow you to upload custom HTML landing pages for events, share them via unique URLs, and automatically register visitors on the platform when they submit the registration form on the landing page.

---

### Overview

```text
+-------------------+     +-------------------+     +-------------------+
|   Admin/Manager   | --> |  Upload HTML Page | --> |  Get Shareable    |
|   Dashboard       |     |  + Event Details  |     |  Landing Page URL |
+-------------------+     +-------------------+     +-------------------+
                                                              |
                                                              v
+-------------------+     +-------------------+     +-------------------+
|  Visitor Fills   | --> |  Edge Function    | --> |  Auto-Register    |
|  Registration    |     |  Processes Form   |     |  + Send Creds     |
|  on Landing Page |     |                   |     |  via Email        |
+-------------------+     +-------------------+     +-------------------+
```

---

### 1. Database Changes

**New Tables:**

**`event_landing_pages`** - Stores uploaded HTML landing pages linked to events
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID (nullable) | Link to existing event (optional) |
| title | TEXT | Landing page title |
| slug | TEXT (unique) | URL-friendly identifier (e.g., "annual-summit-2025") |
| html_content | TEXT | The raw HTML content |
| is_active | BOOLEAN | Enable/disable the page |
| association_id | UUID | Which association owns this page |
| created_by | UUID | Who created it |
| registration_enabled | BOOLEAN | Whether registration form is active |
| created_at, updated_at | TIMESTAMP | Audit timestamps |

**`event_registrations`** - Tracks event registrations and links to platform users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| landing_page_id | UUID | Which landing page |
| email | TEXT | Registrant email |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| phone | TEXT (nullable) | Phone number |
| user_id | UUID (nullable) | Created platform user ID |
| registration_data | JSONB | Additional form fields |
| status | TEXT | pending, completed, failed |
| created_at | TIMESTAMP | When they registered |

---

### 2. New Edge Functions

**`process-event-registration`** (verify_jwt = false - public access)
- Receives registration form data from the landing page
- Validates email and required fields
- Creates a new auth user with auto-generated password
- Creates a member record (basic member role)
- Sends login credentials via email using Resend
- Records the registration in `event_registrations` table

**`get-landing-page`** (verify_jwt = false - public access)
- Fetches and returns the HTML content by slug
- Returns 404 if page not found or inactive

---

### 3. New Frontend Components

**Admin/Association Management UI:**
- **`EventLandingPages.tsx`** - List all landing pages for the organization
- **`CreateLandingPage.tsx`** - Form to create/edit landing pages with:
  - Title and slug (auto-generated from title)
  - HTML file upload (or paste HTML content)
  - Preview capability
  - Toggle for active/inactive
  - Copy shareable URL button

**Public Landing Page Renderer:**
- **`/event/:slug`** route (public, no auth required)
- **`EventLandingPageView.tsx`** - Renders the uploaded HTML
- Injects a registration form handler script into the HTML
- The script intercepts form submissions and calls the edge function

---

### 4. How the Registration Flow Works

1. **Visitor lands on** `https://yoursite.com/event/annual-summit-2025`
2. **System fetches** HTML content from database via `get-landing-page` edge function
3. **HTML is rendered** in an iframe or directly (with sanitization)
4. **Visitor fills the form** (name, email, phone, etc.)
5. **Form submission is intercepted** by injected JavaScript
6. **Edge function `process-event-registration`**:
   - Generates a secure random password
   - Creates auth user with auto-confirmed email
   - Creates member record
   - Sends email with: "Welcome! Your login credentials are: Email: x, Password: y"
7. **Success message** shown to visitor

---

### 5. File Structure

```text
New Files:
src/pages/admin/EventLandingPages.tsx
src/pages/admin/CreateLandingPage.tsx
src/pages/public/EventLandingPageView.tsx
supabase/functions/process-event-registration/index.ts
supabase/functions/get-landing-page/index.ts

Modified Files:
src/App.tsx (add new routes)
supabase/config.toml (add function configs)
```

---

### 6. Route Changes

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/admin/event-landing-pages` | EventLandingPages | Yes |
| `/admin/event-landing-pages/new` | CreateLandingPage | Yes |
| `/admin/event-landing-pages/:id/edit` | CreateLandingPage | Yes |
| `/association/event-landing-pages` | EventLandingPages | Yes |
| `/event/:slug` | EventLandingPageView | **No** (public) |

---

### 7. Security Considerations

1. **HTML Sanitization**: Use DOMPurify (already installed) to sanitize uploaded HTML
2. **Rate Limiting**: Limit registrations per IP/email to prevent abuse
3. **CAPTCHA**: Optionally integrate reCAPTCHA for the registration form
4. **Password Security**: Auto-generated passwords will be 12+ characters with mixed case, numbers, and symbols
5. **RLS Policies**: 
   - Landing pages visible only to their association owners
   - Registration records visible only to admins

---

### 8. Email Template for Credentials

```text
Subject: Welcome to SMB Connect - Your Event Registration is Complete!

Hello [First Name],

Thank you for registering for [Event Name]!

Your SMB Connect account has been created. Use these credentials to log in:

Email: [their-email@example.com]
Password: [auto-generated-password]

Login here: https://smb-connect-hub.lovable.app/auth/login

For security, we recommend changing your password after your first login.

See you at the event!
- The SMB Connect Team
```

---

### Technical Notes

- The existing `RESEND_API_KEY` secret will be used for sending credential emails
- HTML uploads will be stored directly in the database (not file storage) for simplicity and security
- The slug field will be auto-generated from the title but editable
- A maximum HTML size limit of 5MB will be enforced
- The landing page renderer will use an iframe with sandbox attributes for security

