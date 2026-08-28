# Project History & Lessons Learned

This document serves as a persistent memory of past sessions, specifically capturing design decisions, corrected mistakes, and project-specific requirements so they are automatically loaded into context for future sessions.

## 1. Authentication & Routing Flow
- **Rule:** Whenever any link is opened for the first time or after a refresh, the user MUST be prompted with the Login page first.
- **Rule:** After login, if the user has not set up a custom password, they must be forced to set a new password. Only after this flow is complete should they be granted access to the Dashboard or their respective portal. No exceptions.

## 2. UI / UX Design Patterns
- **Google Keep Style Menus:** For expanding menus (like Phases and Exercises), do not use large modals that block the 3D model. Instead, use an upward-expanding, floating card menu (similar to Google Keep). When an individual item (like an exercise) is clicked for details, *then* transition to a full-screen view.
- **Floating Action Buttons (FABs):** The buttons triggering these menus must be strictly circular and uniform in size. Do not use generic square buttons. (Current sizing pattern: `clamp(54px, 14vw, 66px)`).
- **Icons:** Always use the specific, user-provided assets (e.g., the custom arrow logo for phases, custom exercises logo) and ensure they are contained within the circular frames properly.

## 3. WhatsApp Integration
- **Personalized Message Field:** A specific global field for a "Personalized WhatsApp Message" exists in the Capture Form. It must be located *below* the "Recommended Exercises" section.
- **Message Structure:** The custom message written by the physio is inserted at the top of the WhatsApp message. The link to the portal must ALWAYS be placed at the bottom, labeled specifically as "Your Personalized Plan for [Customer Name]". Below the link, standard salutations must be appended (e.g., "Best regards, \n Dr. [Physio Name]").

## 4. Admin Privileges
- Features like "Edit Body" should be accessible via a tab in the sidebar navigation but must be strictly restricted to the `admin` role.

## Past Mistakes to Avoid
- **Wrong Image Assets:** Pay close attention when the user uploads an image to replace an icon. Ensure the exact requested image is used rather than defaulting to generic placeholders.
- **UI Inconsistencies:** Previously, the Phases button lost its circular shape and became a square, mismatching the Exercises button. Always verify that counterpart UI elements match perfectly in size and shape.
- **Cache/Deployment Confusion:** If a recently added feature (like the WhatsApp textarea) does not appear in the user's UI, it is often due to aggressive browser caching or Vercel edge caching of single-page apps. Remind the user to hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
