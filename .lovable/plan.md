

## Fix Coupon Registration Issues - Implementation Plan

This plan addresses the issues preventing successful coupon-based registrations on the event landing pages.

---

### Problems Identified

| Issue | Description | Impact |
|-------|-------------|--------|
| **Missing Registration Fee** | The Bharat DtoC landing page has `registration_fee = null` | Coupon UI section is not injected into forms |
| **Field Name Detection** | Form field name matching may not capture all variations | Required fields may be missed during form submission |
| **No User Feedback on Errors** | Errors from the edge function may not be visible to users | Users think registration succeeded when it failed |

---

### What Will Be Fixed

| Fix | Description |
|-----|-------------|
| **Set Registration Fee** | Update Bharat DtoC landing page to have a registration fee |
| **Improve Field Mapping** | Add more common field name variations for first_name, last_name, email |
| **Better Error Handling** | Ensure all error responses from edge function are shown to users |
| **Debug Logging** | Add console logging to help debug form submission issues |

---

### Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/public/EventLandingPageView.tsx` | **Modify** | Improve field name detection and add debug logging |
| Database | **Update** | Set registration_fee for Bharat DtoC page |

---

### Technical Details

**1. Database Update**
Set a registration fee for the Bharat DtoC landing page:
```sql
UPDATE event_landing_pages 
SET registration_fee = 1000 
WHERE slug = 'bharat-dtoc-2026';
```

**2. Improved Field Name Detection**
Currently the code looks for:
- `email`, `first_name`, `last_name`, `phone`

Will add detection for common variations:
- Email: `email`, `Email`, `EMAIL`, `user_email`, `userEmail`, `e-mail`
- First Name: `first_name`, `firstName`, `FirstName`, `fname`, `given_name`
- Last Name: `last_name`, `lastName`, `LastName`, `lname`, `surname`, `family_name`
- Phone: `phone`, `Phone`, `mobile`, `Mobile`, `telephone`, `cell`

**3. Enhanced Form Submission Handler**
```javascript
// In the iframe script
document.addEventListener('submit', function(e) {
  e.preventDefault();
  
  var form = e.target;
  var formData = new FormData(form);
  var data = {};
  
  // Collect all form data
  formData.forEach(function(value, key) {
    data[key] = value;
  });
  
  console.log('[SMB Registration] Form data:', data);
  
  // Try multiple field name variations
  var email = data.email || data.Email || data.EMAIL || data.user_email;
  var firstName = data.first_name || data.firstName || data.name?.split(' ')[0];
  var lastName = data.last_name || data.lastName || data.name?.split(' ').slice(1).join(' ');
  
  if (!email) {
    console.error('[SMB Registration] No email found in form');
    alert('Please enter your email address');
    return;
  }
  
  // Send to parent with normalized field names
  window.parent.postMessage({
    type: 'event-registration',
    data: {
      ...data,
      email: email,
      first_name: firstName,
      last_name: lastName
    }
  }, '*');
});
```

**4. Better Error Handling in Parent**
Ensure error messages from the edge function are displayed prominently:
- Show specific error messages (duplicate email, invalid coupon, etc.)
- Log detailed errors to console for debugging
- Display user-friendly messages in the overlay

---

### Immediate Action Needed

Before implementing code changes, you should:

1. **Set the registration fee** for Bharat DtoC in the admin panel (or I can update it via database)
2. **Use a new email** for testing (existing emails are blocked as duplicates)
3. **Check the browser console** for any JavaScript errors when submitting the form

---

### Summary of Changes

1. Set `registration_fee` on the landing page to enable coupon UI
2. Improve field name detection in the form submission script
3. Add console logging to help debug issues
4. Ensure all edge function errors are properly shown to users

