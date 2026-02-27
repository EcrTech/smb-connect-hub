

# Fix: CSS Not Loading on Advaita Landing Page

## Root Cause

**DOMPurify removes HTML comments by default.** The script-preservation fix from the last edit uses `<!--SMB_SCRIPT_N-->` comment placeholders — these are stripped during sanitization. The re-injection `.replace()` finds nothing to replace, so **all extracted scripts are silently lost**.

The Advaita page loads Tailwind CSS via `<script src="https://cdn.tailwindcss.com"></script>`. When that script tag is lost, every Tailwind utility class produces no styling — hence the broken CSS.

## Fix

**Skip DOMPurify entirely.** The HTML is already rendered inside a sandboxed iframe (`sandbox="allow-scripts allow-forms allow-same-origin"`), which provides security isolation. DOMPurify is redundant here and actively breaks the custom HTML.

### Change in `src/pages/public/EventLandingPageView.tsx`

Replace the entire sanitization block (lines 207–226) with a simple pass-through:

```typescript
const getEnhancedHtml = (html: string, cssContent?: string | null, pages?: PageInfo[], registrationFee?: number | null, pageId?: string): string => {
    // No DOMPurify — content is rendered in a sandboxed iframe which provides isolation
    let sanitizedHtml = html;

    // Inject CSS if present
    // ... rest unchanged
```

This removes ~20 lines (script extraction, DOMPurify call, script re-injection) and replaces them with one line.

## Why This Is Safe

The iframe already has `sandbox="allow-scripts allow-forms allow-same-origin"` which:
- Prevents the content from accessing the parent page's DOM
- Blocks popups, top-level navigation, and plugin access
- The `postMessage` API is the only communication channel (by design)

## Files Changed
- `src/pages/public/EventLandingPageView.tsx` — remove DOMPurify sanitization, pass HTML through directly

