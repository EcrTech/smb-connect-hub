

## Add Separate CSS Storage for Landing Pages

This update will add a dedicated CSS field so you can upload or paste CSS separately from HTML, making it easier to manage and update styles independently.

---

### Overview

Currently, CSS must be embedded within the HTML content. With this change you will be able to:
- Upload a separate CSS file or paste CSS directly
- Update CSS without touching the HTML structure
- Keep content and styling cleanly separated

---

### How It Will Work

1. You upload an HTML file (structure and content)
2. You upload a CSS file or paste CSS (styling) in a separate tab
3. Both are stored in the database
4. When the public page loads, the CSS is injected into the HTML automatically

---

### Changes Summary

| Area | What Changes |
|------|--------------|
| Database | Add `css_content` column to `event_landing_pages` table |
| Admin Editor | Add new "CSS" tab with file upload and textarea |
| Public Viewer | Inject stored CSS into the rendered HTML |
| Edge Function | Return `css_content` in the response |

---

### Technical Details

**1. Database Migration**

Add a new nullable TEXT column to store CSS:

```sql
ALTER TABLE public.event_landing_pages
ADD COLUMN css_content TEXT;
```

**2. Admin UI Updates (CreateLandingPage.tsx)**

- Add state variable for CSS content
- Add a new "CSS" tab in the Tabs component alongside "Edit" and "Preview"
- Add CSS file upload button (accepts .css files only)
- Add textarea for pasting CSS directly
- Include CSS content when saving to database
- Load existing CSS when editing a page
- Update preview to include CSS styling

**3. Public View Updates (EventLandingPageView.tsx)**

- Update the `LandingPageData` interface to include `css_content`
- Modify the `getEnhancedHtml` function to inject CSS into the `<head>` section:

```typescript
// Inject CSS before the form interception script
let enhancedHtml = sanitizedHtml;
if (cssContent) {
  const styleTag = `<style>${cssContent}</style>`;
  if (enhancedHtml.includes('</head>')) {
    enhancedHtml = enhancedHtml.replace('</head>', styleTag + '</head>');
  } else if (enhancedHtml.includes('<body>')) {
    enhancedHtml = enhancedHtml.replace('<body>', '<head>' + styleTag + '</head><body>');
  } else {
    enhancedHtml = styleTag + enhancedHtml;
  }
}
```

**4. Edge Function Updates (get-landing-page/index.ts)**

Add `css_content` to the SELECT query and response:

```typescript
const { data: landingPage } = await supabase
  .from('event_landing_pages')
  .select(`
    id, title, slug, html_content, css_content, is_active, registration_enabled,
    association_id, associations (name, logo)
  `)
  .eq('slug', slug)
  .eq('is_active', true)
  .single();

// In response:
return new Response(JSON.stringify({
  ...existingFields,
  css_content: landingPage.css_content
}));
```

---

### File Changes

| File | Changes |
|------|---------|
| New SQL migration | Add `css_content TEXT` column |
| `src/pages/admin/CreateLandingPage.tsx` | Add CSS tab, file upload, textarea, and save logic |
| `src/pages/public/EventLandingPageView.tsx` | Inject CSS into iframe HTML |
| `supabase/functions/get-landing-page/index.ts` | Include `css_content` in query and response |

---

### Validation

- CSS file size limit: 2MB (prevents oversized uploads)
- CSS is sanitized to prevent any JavaScript injection
- If no CSS is provided, the landing page renders with whatever styles are embedded in the HTML
- External stylesheets via `<link>` tags in HTML will continue to work

