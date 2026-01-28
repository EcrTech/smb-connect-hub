

## Hide Floating Logo on Event Landing Pages

This is a simple fix to hide the SMB Connect floating logo button on public event landing pages.

---

### The Problem

The floating SMB Connect logo (HomeButton) appears on all pages except login and register pages. It's currently showing on event landing pages where it overlaps with the event's own branding and creates visual confusion.

---

### The Solution

Update the route check in `App.tsx` to also hide the HomeButton on event landing pages.

---

### File Change

**src/App.tsx**

Update the `hideHomeButton` logic from:

```typescript
const hideHomeButton = ['/', '/auth/login', '/auth/register'].includes(location.pathname);
```

To:

```typescript
const hideHomeButton = 
  ['/', '/auth/login', '/auth/register'].includes(location.pathname) || 
  location.pathname.startsWith('/event/');
```

This will hide the floating logo on all routes that start with `/event/`, covering both the main event page (`/event/bharat-dtoc-2026`) and any sub-pages (`/event/bharat-dtoc-2026/schedule`).

---

### Summary

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/event/` path check to `hideHomeButton` condition |

