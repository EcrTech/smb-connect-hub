

# Plan: Add SMBConnect Registration to Advaita Landing Page HTML

## Problem
The Advaita landing page's `handleRegistration()` function calls `event.preventDefault()` and either shows a thank-you modal or redirects to Razorpay — but never sends data to the platform via `postMessage`. The platform's injected `submit` listener never fires because the inline `onsubmit="handleRegistration(event)"` prevents it.

## Fix
Update the `html_content` in the database for the Advaita landing page to add a `window.parent.postMessage()` call inside the existing `handleRegistration()` function. This sends the form data to the platform for processing before continuing with the existing coupon/payment logic.

### What changes in the HTML

The existing `handleRegistration` function:
```javascript
function handleRegistration(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    console.log("Registration Details:", data);
    // ... coupon check / Razorpay redirect
}
```

Will become:
```javascript
function handleRegistration(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    console.log("Registration Details:", data);

    // Send registration to SMB Connect platform
    var nameParts = (data.name || '').trim().split(/\s+/);
    var firstName = nameParts[0] || '';
    var lastName = nameParts.slice(1).join(' ') || '';
    window.parent.postMessage({
        type: 'event-registration',
        data: {
            email: data.email || '',
            first_name: firstName,
            last_name: lastName,
            phone: data.phone || '',
            coupon_code: data.coupon || '',
            company: data.company || '',
            city: data.city || ''
        }
    }, '*');

    // ... existing coupon check / Razorpay redirect (unchanged)
}
```

### Implementation
A single database UPDATE statement to replace the `handleRegistration` function in the stored HTML, adding the `postMessage` call right after the `console.log` line and before the coupon check logic. All existing behavior (coupon validation, Razorpay redirect, thank-you modal) remains untouched.

