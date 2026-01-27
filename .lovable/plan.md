

## Add Event Landing Pages Navigation Button

A quick addition to make the Event Landing Pages feature accessible from the Admin Actions page.

---

### Change Required

**File:** `src/pages/admin/AdminActions.tsx`

Add a button in the "Quick Actions" section (around line 296-297, after Event Calendar button):

```tsx
<Button variant="outline" className="w-full" onClick={() => navigate('/admin/event-landing-pages')}>
  <FileText className="w-4 h-4 mr-2" />
  Event Landing Pages
</Button>
```

Also import the `FileText` icon from lucide-react.

---

### Result

After this change, you'll see an **"Event Landing Pages"** button in the Admin Actions page that takes you directly to the landing pages management section.

---

### Summary

| File | Change |
|------|--------|
| `src/pages/admin/AdminActions.tsx` | Add import for `FileText` icon; Add navigation button for Event Landing Pages |

