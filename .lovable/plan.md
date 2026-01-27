

## Add Multi-Page Support for Landing Pages

This update will allow each landing page to have multiple pages (e.g., Home, About, Schedule, Speakers) instead of just one single page.

---

### Overview

Currently, each landing page has a single HTML content and CSS. With this change:
- Each landing page can have multiple sub-pages
- Each sub-page has its own HTML content
- All sub-pages share the same CSS (for consistent styling)
- Navigation between pages is handled automatically

---

### How It Will Work

```text
Landing Page: "Annual Summit 2025"
  ├── Page 1: Home (default)     → /event/annual-summit-2025
  ├── Page 2: Schedule           → /event/annual-summit-2025/schedule
  ├── Page 3: Speakers           → /event/annual-summit-2025/speakers
  └── Page 4: Register           → /event/annual-summit-2025/register
```

---

### Database Changes

**New Table: `event_landing_page_pages`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| landing_page_id | UUID | Reference to parent landing page |
| title | TEXT | Page title (e.g., "Home", "Schedule") |
| slug | TEXT | Sub-page slug (e.g., "schedule") - empty for default |
| html_content | TEXT | HTML content for this page |
| sort_order | INTEGER | Order of pages in navigation |
| is_default | BOOLEAN | Is this the default/home page |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Updates to `event_landing_pages` table:**
- Keep `css_content` for shared CSS across all pages
- Remove `html_content` (moved to sub-pages table) - or keep for backward compatibility

---

### Admin UI Changes

**CreateLandingPage.tsx Updates:**

1. Add a "Pages" section with tabs for each sub-page
2. Add "New Page" button to create additional pages
3. Each page tab shows:
   - Page title input
   - Page slug input
   - HTML content editor with file upload
4. Drag-and-drop to reorder pages
5. Delete button for non-default pages

```text
+------------------------------------------+
|  Basic Information (title, slug, etc.)   |
+------------------------------------------+
|  Pages:                                  |
|  [Home] [Schedule] [Speakers] [+ Add]    |
+------------------------------------------+
|  HTML Tab | CSS Tab | Preview Tab        |
|  +--------------------------------------+|
|  | <html content for selected page>    ||
|  +--------------------------------------+|
+------------------------------------------+
```

---

### Public View Changes

**EventLandingPageView.tsx Updates:**

1. Accept optional sub-page slug from URL: `/event/:slug/:subPage?`
2. Fetch all pages for the landing page
3. Render the matching page (or default if no sub-page specified)
4. Inject navigation script for internal links

---

### Route Changes

**App.tsx Updates:**
- Add route: `/event/:slug/:subPage?`

---

### Edge Function Updates

**get-landing-page/index.ts:**
- Accept optional `page` query parameter
- Return all pages metadata + the requested page content
- Include navigation structure in response

---

### File Changes Summary

| Area | Changes |
|------|---------|
| Database | Create `event_landing_page_pages` table |
| Routes | Add sub-page parameter to event route |
| Admin UI | Add pages management with tabs |
| Public View | Handle sub-page routing and navigation |
| Edge Function | Return pages structure and specific page content |

---

### Technical Implementation Details

**1. Database Migration**

```sql
-- Create pages table
CREATE TABLE public.event_landing_page_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES public.event_landing_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(landing_page_id, slug)
);

-- Enable RLS
ALTER TABLE public.event_landing_page_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin access)
CREATE POLICY "Admins can manage landing page pages"
  ON public.event_landing_page_pages
  FOR ALL
  USING (is_admin_safe(auth.uid()));
```

**2. Admin UI State Management**

```typescript
// New state for managing multiple pages
const [pages, setPages] = useState<PageData[]>([
  { id: 'temp-1', title: 'Home', slug: '', htmlContent: '', isDefault: true, sortOrder: 0 }
]);
const [activePageIndex, setActivePageIndex] = useState(0);
```

**3. Public View Routing**

```typescript
const { slug, subPage } = useParams<{ slug: string; subPage?: string }>();
// Fetch page matching subPage, or the default page if not specified
```

**4. Backward Compatibility**

Existing landing pages with `html_content` will continue to work. A migration can optionally move existing content to the new pages table.

---

### User Experience

1. **Creating a landing page:**
   - Start with a default "Home" page
   - Click "+ Add Page" to add more pages
   - Each page gets its own HTML editor
   - One CSS file applies to all pages

2. **Viewing a landing page:**
   - Default page loads at `/event/your-event`
   - Sub-pages load at `/event/your-event/page-slug`
   - Internal links between pages work automatically

