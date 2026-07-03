---
name: Clinical Precision Mobile
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434655'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  touch-target-min: 48px
---

## Brand & Style

This design system is engineered for a high-stakes healthcare environment, specifically focused on the management of IoT smart hardware. The brand personality is **reliable, professional, and empathetic**, prioritizing clarity over decorative flourishes. 

The aesthetic follows a **Corporate Modern** style inspired by Material 3, emphasizing a "safety-first" user experience. The interface uses expansive whitespace to reduce cognitive load, ensuring that patients—including those with limited dexterity or visual impairments—can navigate the medication schedule with absolute confidence. The emotional response should be one of "calm control," where the technology feels like an invisible, dependable assistant rather than a complex medical device.

## Colors

The palette utilizes highly recognizable semantic colors to communicate system status instantly. 
- **Primary (Blue):** Used for primary actions, active navigation states, and brand presence.
- **Success (Green):** Specifically reserved for "Dose Taken" confirmations and "Device Connected" statuses.
- **Warning (Orange):** Used for "Low Refill" alerts or "Missed Dose" warnings that require attention but not panic.
- **Danger (Red):** Exclusively for critical system errors, hardware jams, or urgent medication alerts.
- **Surface & Background:** A subtle distinction between the light gray background and white cards creates a "layered" effect that helps users distinguish interactive zones from the canvas.

## Typography

The design system utilizes **Inter** for its exceptional legibility and neutral, professional tone. To accommodate a healthcare demographic, font sizes are bumped 10-15% larger than standard mobile apps. 

- **Headlines:** Bold and tight-tracking for clear hierarchy at the top of medication schedules.
- **Body:** Generous line-height (1.5x) to ensure long lists of medication instructions remain readable.
- **Labels:** Used for metadata like "Dosage" or "Time of Day," utilizing medium and semi-bold weights to remain distinct even at smaller sizes.

## Layout & Spacing

The design system follows a **Fluid Grid** model optimized for the Android handheld form factor. It adheres to an 8px spacing rhythm to maintain mathematical harmony.

- **Margins:** A standard 24px horizontal margin provides a spacious, premium feel and prevents fingers from obscuring content on edge-to-edge displays.
- **Touch Targets:** All interactive elements (buttons, toggles, list items) must maintain a minimum height of 48px, though 56px is preferred for medication action buttons.
- **Vertical Rhythm:** Large 24px gaps between "Medicine Cards" allow the user to focus on one pill type at a time without visual crowding.

## Elevation & Depth

This design system uses **Tonal Layering** combined with subtle **Ambient Shadows** to define hierarchy. 

1. **Level 0 (Background):** #F8FAFC - The base canvas.
2. **Level 1 (Cards/Surface):** #FFFFFF - Primary content containers with a very soft, diffused shadow (0px 4px 20px, 4% opacity black) to provide a gentle lift.
3. **Level 2 (Modals/Overlays):** These use a stronger shadow and a 20% background dim (scrim) to focus user attention on critical alerts or medication confirmations.

Avoid harsh borders. Depth should be felt through the transition from the cool gray background to the crisp white interactive surfaces.

## Shapes

The shape language is **Soft and Friendly**. A "Rounded" logic is applied to convey safety and approachability. 

- **Cards:** 16px to 24px corner radius. Larger radius (24px) should be used for the primary "Current Dose" card on the dashboard to give it a softer, more prominent appearance.
- **Buttons:** Fully rounded (pill-shaped) for primary actions to distinguish them clearly from content cards.
- **Inputs:** 12px corner radius, balancing the structure of a text field with the overall soft aesthetic.

## Components

- **Buttons:** Primary buttons use the #2563EB background with white text. High-contrast is mandatory. For secondary actions, use a tonal variant (light blue background with primary blue text).
- **Medication Cards:** These are the centerpiece. They must include: a large icon (Material Symbol), a clear title (Headline-sm), a secondary line for dosage (Label-lg), and a prominent status badge.
- **Status Badges:** Small, high-contrast pills. "Taken" (Success/Green), "Missed" (Danger/Red), "Pending" (Primary/Blue).
- **Persistent Bottom Navigation:** A 56px to 64px tall bar with 4 tabs. Icons are Material Symbols Rounded. The active state should include a tonal pill-shaped indicator behind the icon, consistent with Material 3.
- **Dose Progress:** A circular or linear progress bar showing "Daily Adherence" should use a thick 8px stroke and rounded caps.
- **Inputs:** Outlined style with a 1px border (#CBD5E1) that thickens to 2px and changes to primary blue when focused.