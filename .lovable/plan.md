

## UTM Link Generator for Event Landing Pages

Add an interactive UTM link generator tool that helps admins create shareable tracking URLs with UTM parameters pre-filled, eliminating the need to use external tools.

---

### What We're Building

A collapsible UTM Link Generator section in the landing page editor that:
1. Lets admins enter custom UTM source, medium, and campaign values
2. Generates a complete URL with those parameters appended
3. Provides one-click copy functionality
4. Shows a preview of the generated link
5. Includes common presets for quick selection

---

### User Experience

```text
┌─────────────────────────────────────────────────────────────┐
│  🔗 UTM Link Generator                              [▼ Expand]
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quick Presets: [WhatsApp] [Email] [LinkedIn] [Facebook]    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ UTM Source   │  │ UTM Medium   │  │ UTM Campaign │       │
│  │ whatsapp     │  │ social       │  │ summit-2025  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
│  Generated URL:                                             │
│  ┌─────────────────────────────────────────────────┐ [Copy] │
│  │ https://smbconnect.in/event/summit-2025?utm_... │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  Use the production domain for tracking:                    │
│  ○ Preview (lovable.app)  ● Production (smbconnect.in)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Features

| Feature | Description |
|---------|-------------|
| **Custom UTM Fields** | Input fields for source, medium, and campaign |
| **Quick Presets** | One-click buttons for common channels (WhatsApp, Email, LinkedIn, Facebook, Twitter) |
| **Domain Toggle** | Switch between preview and production URLs |
| **Live Preview** | Shows the complete URL as you type |
| **Copy Button** | One-click copy to clipboard with success feedback |
| **Validation** | Only generates link when slug is set |

---

### Preset Configurations

| Preset | Source | Medium | Suggested Use |
|--------|--------|--------|---------------|
| WhatsApp | `whatsapp` | `social` | Sharing via WhatsApp groups/broadcasts |
| Email | `email` | `email` | Newsletter or email campaigns |
| LinkedIn | `linkedin` | `social` | LinkedIn posts and messages |
| Facebook | `facebook` | `social` | Facebook posts and ads |
| Twitter/X | `twitter` | `social` | Twitter/X posts |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/CreateLandingPage.tsx` | Add UTM Link Generator component section after the Default UTM Parameters section |

---

### Technical Implementation

1. **New State Variables**
   - `utmLinkSource` - UTM source for link generation
   - `utmLinkMedium` - UTM medium for link generation  
   - `utmLinkCampaign` - UTM campaign for link generation
   - `useProductionDomain` - Toggle between preview/production URL
   - `showUtmGenerator` - Collapsible state

2. **Domain Configuration**
   - Production domain: `smbconnect.in`
   - Uses `/event/{slug}` route format
   - Appends `?utm_source=X&utm_medium=Y&utm_campaign=Z`

3. **Preset Buttons**
   - Clicking a preset auto-fills source and medium
   - Campaign defaults to slug or can be customized

4. **URL Generation Logic**
   ```
   base = useProductionDomain 
     ? "https://smbconnect.in/event/{slug}"
     : "{origin}/event/{slug}"
   
   params = []
   if (source) params.push("utm_source=" + source)
   if (medium) params.push("utm_medium=" + medium)
   if (campaign) params.push("utm_campaign=" + campaign)
   
   url = base + "?" + params.join("&")
   ```

5. **Copy Functionality**
   - Uses `navigator.clipboard.writeText()`
   - Shows toast confirmation on success

