# Aram Creations — Project Rules & Working Principles

## 1. No Demo / No Mock Policy
- Never introduce dummy "Demo AI", test mock buttons, dev preview badges, or fake data states into the user interface or API responses.
- The user operates a real business. All features (AI copywriting, order processing, catalog backups, Vinted syncing) must connect to real production services or legitimate server APIs.

## 2. Universal Error & Progress Feedback Rule
- **Errors**: Never display generic error messages (e.g. "Something went wrong" or "Failed"). Always show the specific reason returned by the server or browser (e.g. HTTP status code, missing field, or exact exception message).
- **Loading & Progress**: Every asynchronous operation (file uploads, video compression, bulk updates, catalog backups, Vinted syncing, checkout) must show explicit visual progress (percentages %, numbered step indicator like "2/3", or animated progress bar).

## 3. Visual & Functional Parity (Shop & Portfolio)
- The Hero Section and Hero Video must have identical dimensions, aspect ratios, responsive styling, and autoplay/loop controls across both Shop (`#shop`) and Portfolio (`#portfolio`).
- Design updates, category tabs, and card styles applied in the Back Office (`#admin`) must immediately and consistently reflect in both public views.

## 4. Scroll Affordance
- Whenever a full-height or large hero banner/video is present, a clear, animated scroll indicator (downward chevron or bounce cue) must be visible on both mobile devices and desktop computers so visitors know products follow below.

## 5. Vinted Content Sanitization
- Boilerplate condition phrases from Vinted (such as "Καινούργιο με ετικέτα", "Very good", "New with tags") must be completely stripped out and never appear in public descriptions, notes, or product cards.

## 6. Advanced Tools & Feature Retention
- Never remove advanced features that existed in prior versions (e.g., bulk find & replace text, batch price modifiers, inventory export tools). When refactoring, retain or restore all advanced capabilities.

## 7. Automated Deploy & Configuration
- Package environment variables, build parameters, and redirects directly in `netlify.toml` and `.env` where permitted, minimizing manual setup steps in external dashboards.

## 8. Media Studio & Image Resiliency
- Image editing and thumbnail loading must always supply `referrerPolicy="no-referrer"` to prevent external CDNs (like Vinted or social platforms) from blocking hotlinked media.
- Editor buttons must always resolve the target media reliably with safe fallbacks and explicit error alerts if an unsupported format (like GIF animation) is selected.

