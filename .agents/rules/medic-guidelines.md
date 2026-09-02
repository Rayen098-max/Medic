# Medic App Guidelines

When working on the Medic repository, you must adhere to the following strict guidelines:

## 1. UI & Aesthetics
- **Floating Action Buttons (FABs)**: Always use the established circular high-contrast design. The background should be a bright pale blue with a dark navy icon for maximum visibility against the dark grids.
- **Mobile Responsiveness**: When positioning floating panels and buttons in the `CustomerPortal.jsx`, you must use CSS `clamp()` for sizing and `env(safe-area-inset-bottom/right)` for positioning to ensure they do not clip on mobile devices.
- **Keep Menu Cards**: Use the `.keep-menu-container` and `.keep-menu-card` CSS patterns for unified dropdown menus.

## 2. Asset Processing
- **Image Conversion**: If you need to write a script (e.g., Python) to recolor transparent PNGs, you must check the alpha channel (`a > 50`) to preserve the transparency boundary. Do not apply blanket grayscale conversions (`convert("L")`) as this will render transparent backgrounds as solid blocks.

## 3. Architecture & State Management
- **Role-Based Access (RBAC)**: When restricting a feature from a specific role (e.g., locking tabs for `physio`), you must do two things:
  1. Hide the item visually in `src/components/layout/app-sidebar.tsx`.
  2. Implement an explicit redirect in `src/App.jsx` using the `redirectTo` prop in `<ProtectedRoute>` to prevent infinite redirect loops.
- **Variable Context**: Inside `CustomerPortal.jsx`, patient data is strictly referenced via the `patient` state object (not `r` or any other generic iterator from `AdminPanel`).
- **Data Fetching**: When dealing with live Google Sheet fetches (like in the `Tasks` view), prioritize `localStorage` caching with automated time slots to prevent continuous React re-renders that wipe out active user forms.

## 4. Account Management
- **Resetting Physio Accounts**: When clearing or resetting physio accounts, you must:
  1. Generate a new secure, temporary password.
  2. Update the user in Supabase Auth with the new password.
  3. Crucially, set `user_metadata: { password_changed: false }` to force the app's `SetupPassword.jsx` screen to trigger on their next login.
  4. Save the temporary credentials securely (e.g., to `.credentials_reset.txt`) and never commit them to version control.
  - *Note: You can use the existing `scripts/reset-physios.js` script to automate this.*
