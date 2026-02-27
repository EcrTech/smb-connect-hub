

# Plan: Add Registration SDK Snippet to Admin Landing Page Creator

## Current State
The `CreateLandingPage.tsx` page has a "Form Field Names" help section (lines 758-769) that tells developers which field names to use, but there is **no copyable SDK snippet** anywhere in the admin UI. Developers have no way to get the integration code they need to embed in their custom HTML.

## What Will Change

### 1. Create the SDK file: `public/smb-register.js`
A lightweight standalone script (~60 lines) that:
- Exposes `window.SMBConnect.register(formData)` — sends a `postMessage` to the parent iframe with the form data
- Exposes `window.SMBConnect.validateCoupon(code, email)` — validates coupons via `postMessage`
- Automatically reads `data-landing-page-id` from its own `<script>` tag
- Works inside the platform's iframe (primary mode) and degrades gracefully outside it

### 2. Inject the SDK automatically into the iframe in `EventLandingPageView.tsx`
- Add a `<script>` tag for the SDK into the enhanced HTML so it's always available inside the iframe
- Keep the existing capture-phase `submit` listener as a fallback for pages that don't use the SDK
- Upgrade the existing listener to use `capture: true` so it fires before custom handlers

### 3. Add "Registration Integration" card to `CreateLandingPage.tsx`
A new card shown when `registrationEnabled` is true, appearing after the registration fee section. Contains:
- A copyable code snippet showing exactly how to use `SMBConnect.register()` in their form
- The snippet is pre-populated with the correct `landing_page_id` (when editing)
- A "Copy Code" button that copies the snippet to clipboard
- Brief instructions explaining that this is the recommended approach for custom HTML forms

The snippet will look like:

```html
<form id="registration-form">
  <input type="email" name="email" required />
  <input type="text" name="first_name" required />
  <input type="text" name="last_name" required />
  <input type="tel" name="phone" />
  <button type="submit">Register</button>
</form>

<script>
  document.getElementById('registration-form')
    .addEventListener('submit', function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      window.parent.postMessage({
        type: 'event-registration',
        formData: {
          email: fd.get('email'),
          first_name: fd.get('first_name'),
          last_name: fd.get('last_name'),
          phone: fd.get('phone') || ''
        }
      }, '*');
    });
</script>
```

### Files Changed
- **New**: `public/smb-register.js` — standalone SDK
- **Edit**: `src/pages/admin/CreateLandingPage.tsx` — add "Registration Integration" card with copyable snippet
- **Edit**: `src/pages/public/EventLandingPageView.tsx` — inject SDK into iframe, upgrade `submit` listener to capture phase

