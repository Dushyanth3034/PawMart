# PawMart Premium Design System

## Goal
Transform PawMart into an award-winning premium marketplace with a UI/UX comparable to Apple, Stripe, Linear, Framer, Airbnb, and Tesla. The application must feel minimal, modern, luxurious, friendly, trustworthy, interactive, and fast.

## Color Palette
- **Background**: Extremely clean white/light gray (`#FCFCFD`). No heavy tinting.
- **Primary Text**: Deepest off-black (`#09090B`) for high contrast readability.
- **Muted Text**: Soft gray (`#A1A1AA`) for secondary information.
- **Brand/Accent**: A punchy Airbnb-esque coral/red (`#FF5A5F`) used *very sparingly* for calls to action, highlights, and notifications.
- **Surfaces/Cards**: 
  - Glassmorphic translucent whites with a subtle inner light border (`rgba(255, 255, 255, 0.7)` with `inset 0 1px 1px rgba(255, 255, 255, 0.5)`).
  - High-end dark mode components using solid Zinc (`#18181B`).

## Typography
- **Primary Font**: `Outfit` for all headings, massive, bold, and tightly tracked.
- **Secondary Font**: `Plus Jakarta Sans` for all body text, highly legible, generously line-spaced.
- **Hierarchy**:
  - H1: 64px, Extra Bold, tight tracking (-0.02em).
  - H2: 48px, Bold.
  - H3: 32px, Bold.
  - Body: 16px to 18px, Regular, 160% line-height.
  - Micro-copy: 12px, Uppercase, bold, tracking widest.

## Spacing & Layout
- **Organic White Space**: Embrace massive padding. Sections should have 120px to 160px of vertical space between them (Apple style).
- **Auto Layout**: Strict alignment. Elements must sit cleanly on a 4px/8px baseline grid.
- **Containers**: Max width 1400px.

## Shapes & Borders
- **Border Radius**: 
  - Massive rounded corners: 24px, 32px, or even 40px for major hero cards and images.
  - Pills: Buttons and badges should be fully rounded (`rounded-full`).
- **Borders**: Very subtle, 1px solid `rgba(0,0,0,0.05)`.

## Shadows & Elevations
- Forget standard drop shadows. Use layered, soft, diffuse shadows.
- **Floating**: `0 20px 40px -20px rgba(0,0,0,0.15)` for cards hovering off the page.
- **Glass**: `0 4px 30px rgba(0, 0, 0, 0.05)` combined with backdrop-blur.

## Interactions & Animation
- **Hover Lift**: Cards should physically lift slightly (`transform translateY(-4px)`) and increase shadow spread smoothly over `400ms`.
- **Framer Motion**: Elements should `fade-in-up` dynamically on scroll.
- **Micro-interactions**: Button click scaling (down to 0.95), ripple effects, animated counts.
- **Loading**: Shimmering skeletons rather than spinners.

## Components Specification
- **Navbar**: Floating pill shape, glassmorphic, centered navigation links, separated from the top edge by 24px.
- **Cards**: Edge-to-edge imagery, extremely clean padding for text underneath. Text should not sit on the image unless there is a strong gradient scrim.
- **Buttons**:
  - Primary: Solid black (`#000000`) or Solid Accent (`#FF5A5F`), white text, pill shape, bouncy scale on click.
  - Secondary: Glass outline, semi-transparent background.
- **Forms (Stripe style)**:
  - Inputs: Large 56px height, 16px radius, extremely subtle gray background (`#F4F4F5`), no border until focused.
  - Focus State: 2px solid black ring, no blurry outlines.
- **Dashboards (Linear style)**:
  - High density, monospace tabular numerals, stark borders, 14px typography, incredibly fast and responsive layout without fluff.
