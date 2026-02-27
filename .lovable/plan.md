

# Fix: DOMPurify Stripping Script Content from Landing Page HTML

## Root Cause
DOMPurify 3.3.0 has `script` in its `DEFAULT_FORBID_CONTENTS` list (line 503 of purify.js). Even though `ADD_TAGS: ['script']` preserves the `<script>` tags, their **content is emptied**. This means:
- The Advaita's `handleRegistration()` function (including the `postMessage` we added) is stripped
- The `onsubmit="handleRegistration(event)"` attribute survives, calling an undefined function → error
- The capture-phase `submit` listener fires first but the subsequent error may interfere

## Fix in `EventLandingPageView.tsx` — `getEnhancedHtml` function

**Extract scripts before sanitization, re-inject after:**

```typescript
const getEnhancedHtml = (html, cssContent, pages, registrationFee, pageId) => {
  // 1. Extract <script> blocks BEFORE DOMPurify
  const scripts: string[] = [];
  const htmlWithoutScripts = html.replace(
    /<script[\s\S]*?<\/script>/gi,
    (match) => {
      scripts.push(match);
      return `<!--SMB_SCRIPT_${scripts.length - 1}-->`;
    }
  );

  // 2. Sanitize the script-free HTML
  let sanitizedHtml = DOMPurify.sanitize(htmlWithoutScripts, {
    ADD_TAGS: ['style', 'link'],
    ADD_ATTR: ['target', 'onclick', 'onsubmit'],
    WHOLE_DOCUMENT: true,
  });

  // 3. Re-inject original scripts
  scripts.forEach((script, i) => {
    sanitizedHtml = sanitizedHtml.replace(
      `<!--SMB_SCRIPT_${i}-->`, script
    );
  });

  // ... rest unchanged (CSS injection, formInterceptScript, SDK)
};
```

This preserves the Advaita's custom JavaScript (including the `postMessage` registration call) while still sanitizing the HTML structure.

## Files Changed
- **Edit**: `src/pages/public/EventLandingPageView.tsx` — extract and re-inject `<script>` blocks around DOMPurify sanitization

