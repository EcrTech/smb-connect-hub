
## End-User Coupon Code Implementation Plan

This plan implements a complete coupon system for event registration forms, allowing visitors to apply discount codes and see real-time price calculations before submitting.

---

### What Will Be Built

| Feature | Description |
|---------|-------------|
| **Registration Fee Field** | New column in landing pages to set the base registration price |
| **Coupon Input Field** | Text field for users to enter coupon codes |
| **Apply Button** | Real-time coupon validation with instant feedback |
| **Price Display** | Shows original price, discount, and final amount |
| **Form Integration** | Passes coupon data to registration edge function |

---

### User Experience Flow

```text
Step 1: User sees event landing page with registration form
        ┌─────────────────────────────────────────┐
        │ Registration Form                       │
        │                                         │
        │ Name: [______________]                  │
        │ Email: [______________]                 │
        │ Phone: [______________]                 │
        │                                         │
        │ Registration Fee: ₹1,000                │
        │                                         │
        │ Have a coupon? [__________] [Apply]     │
        │                                         │
        │ [Register Now - ₹1,000]                 │
        └─────────────────────────────────────────┘

Step 2: User enters coupon code and clicks Apply
        ┌─────────────────────────────────────────┐
        │ ...                                     │
        │ Have a coupon? [EARLY20___] [Apply]     │
        │                                         │
        │ ✓ Coupon applied! 20% off               │
        │                                         │
        │ Original: ₹1,000                        │
        │ Discount: -₹200                         │
        │ ─────────────                           │
        │ Total: ₹800                             │
        │                                         │
        │ [Register Now - ₹800]                   │
        └─────────────────────────────────────────┘

Step 3: Form submits with coupon code included
```

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database Migration | **Create** | Add `registration_fee` column to `event_landing_pages` |
| `supabase/functions/get-landing-page/index.ts` | **Modify** | Include registration_fee in response |
| `supabase/functions/process-event-registration/index.ts` | **Modify** | Calculate amounts based on registration fee |
| `src/pages/public/EventLandingPageView.tsx` | **Modify** | Add coupon UI and price display injection |
| `src/pages/admin/EventLandingPages.tsx` | **Modify** | Add registration fee input when creating/editing pages |
| `src/pages/admin/CreateLandingPage.tsx` | **Modify** | Add registration fee field to the form |

---

### Technical Details

**1. Database Migration**
Add a new column to store the registration fee for each landing page:
- Column: `registration_fee` (numeric, nullable, default null)
- Nullable because some events may be free

**2. Get Landing Page Edge Function**
Update the response to include:
- `registration_fee`: The base price for registration

**3. Process Registration Edge Function**
Update to:
- Fetch `registration_fee` from the landing page
- Calculate `original_amount` from registration fee
- Apply coupon discount to get `discount_amount`
- Calculate `final_amount = original_amount - discount_amount`
- Store all three values in the registration record

**4. EventLandingPageView.tsx Changes**
The injected form script will:
- Dynamically inject coupon UI elements after the last form field
- Add an "Apply" button that calls the `validate-coupon` edge function
- Display validation results (success/error messages)
- Show price breakdown when a valid coupon is applied
- Update the submit button text with the final amount
- Include `coupon_code` in the form data sent to parent window

**5. Admin Landing Page Form**
Add a new input field:
- Label: "Registration Fee (INR)"
- Type: Number input
- Placeholder: "Enter 0 for free events"
- Help text: "Leave empty for free registrations"

---

### Coupon Validation Flow

```text
User clicks "Apply"
      │
      ▼
POST /validate-coupon
{
  code: "EARLY20",
  landing_page_id: "uuid",
  email: "user@email.com"
}
      │
      ▼
┌─────────────────────┐
│ Validation Checks:  │
│ • Code exists       │
│ • Coupon is active  │
│ • Within dates      │
│ • Applies to page   │
│ • Usage limit OK    │
│ • Per-user limit OK │
└─────────────────────┘
      │
      ▼
Response:
{
  valid: true,
  coupon_id: "uuid",
  discount_type: "percentage",
  discount_value: 20,
  message: "Coupon applied! 20% off"
}
      │
      ▼
Calculate & Display:
• Original: ₹1000
• Discount: ₹200 (20% of 1000)
• Final: ₹800
```

---

### Injected Coupon UI Design

The script will inject a styled coupon section that matches common form styling:

```text
<!-- Injected after form fields, before submit button -->
<div id="coupon-section" style="...">
  <div style="margin-bottom: 15px;">
    <label>Registration Fee</label>
    <div style="font-size: 24px; font-weight: bold;">₹1,000</div>
  </div>
  
  <div style="display: flex; gap: 10px; margin-bottom: 10px;">
    <input type="text" id="coupon-input" placeholder="Enter coupon code" />
    <button type="button" id="apply-coupon">Apply</button>
  </div>
  
  <div id="coupon-message"></div>
  
  <div id="price-breakdown" style="display: none;">
    <div>Original: <span id="original-price">₹1,000</span></div>
    <div style="color: green;">Discount: <span id="discount-amount">-₹200</span></div>
    <hr/>
    <div><strong>Total: <span id="final-price">₹800</span></strong></div>
  </div>
</div>
```

---

### Data Flow Summary

| Step | Component | Data |
|------|-----------|------|
| 1 | Page Load | Fetch landing page with `registration_fee` |
| 2 | Script Injection | Inject coupon UI if `registration_fee > 0` |
| 3 | Apply Click | Call `validate-coupon` with code, page_id, email |
| 4 | Validation Response | Receive discount type/value or error |
| 5 | Price Calculation | Calculate and display breakdown in UI |
| 6 | Form Submit | Include `coupon_code` in registration data |
| 7 | Process Registration | Validate coupon again, calculate amounts, store |

---

### Edge Cases Handled

| Case | Behavior |
|------|----------|
| Free event (no fee) | Coupon section not shown |
| Invalid coupon | Show error message, keep original price |
| Expired coupon | Show "This coupon has expired" |
| Usage limit reached | Show "This coupon has reached its usage limit" |
| 100% discount | Show final amount as ₹0 |
| Discount > price | Final amount capped at ₹0 (free) |
| Email not entered | Prompt user to enter email first |
