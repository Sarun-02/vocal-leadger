---
name: Vocal Ledger M3
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444654'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#3051d2'
  primary: '#0033b6'
  on-primary: '#ffffff'
  primary-container: '#2c4ecf'
  on-primary-container: '#cad1ff'
  inverse-primary: '#b8c3ff'
  secondary: '#006d3a'
  on-secondary: '#ffffff'
  secondary-container: '#7ff8a8'
  on-secondary-container: '#00723d'
  tertiary: '#8c0024'
  on-tertiary: '#ffffff'
  tertiary-container: '#ae2239'
  on-tertiary-container: '#ffc5c6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001355'
  on-primary-fixed-variant: '#0636ba'
  secondary-fixed: '#82faab'
  secondary-fixed-dim: '#64dd91'
  on-secondary-fixed: '#00210e'
  on-secondary-fixed-variant: '#00522b'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b5'
  on-tertiary-fixed: '#40000b'
  on-tertiary-fixed-variant: '#910526'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Roboto Flex
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  display-lg-mobile:
    fontFamily: Roboto Flex
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
    letterSpacing: -0.2px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: 0px
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0px
  title-lg:
    fontFamily: Roboto Flex
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0px
  title-md:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.15px
  title-sm:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  body-sm:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.4px
  label-lg:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 11px
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
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies an ultra-focused, calm, and effortlessly functional approach to daily financial tracking. Rooted in the principles of Material 3 (Material You), it strips away the overwhelming dashboard clutter common to legacy banking apps, emphasizing instantaneous voice-first logging and high-clarity visibility into cash flow.

### Personality & Emotion
- **Attentive & Serene:** Financial management should lower cortisol levels. Cool slate neutrals and expansive whitespace provide psychological breathing room.
- **Immediate & Fluent:** Voice interaction is the primary gesture. The interface responds dynamically with fluid tonal transitions and distinct auditory/haptic rhythm.
- **Accurate & Unambiguous:** Balance numbers, transaction amounts, and category indicators prioritize glanceability and absolute semantic clarity.

### Design Movement: Material 3 Minimal
The design strictly embraces Material You's tonal layering, adaptive surface architecture, and tactile pill/rounded geometric hierarchy. Rather than employing heavy structural borders or ornamental skeuomorphism, elevation is expressed through subtle chromatic shifts in container levels, soft ambient shadows, and pill-shaped interactive anchors.

## Colors

The palette establishes an unmistakable semantic model built over an ergonomic slate-gray foundation. 

### Color Roles & Semantics
- **Primary (`#2C4ECF` - Deep Indigo):** The operational core. Used for high-emphasis CTAs, the voice-input listening orb, active bottom-sheet handles, focused field borders, and primary navigation states.
- **Secondary (`#0F9D58` - Emerald Green):** Semantic positive. Dedicated to incoming funds, cash additions, positive month-over-month differentials, and completed goal indicators.
- **Tertiary (`#E1495A` - Coral / Rose Red):** Semantic negative. Reserved for outflows, expenses, over-budget warnings, and critical transaction removals.
- **Neutral (`#64748B` - Slate Neutral):** Provides the tonal surface foundation. Ranging from light crisp slate tints (`#F8FAFC`, `#F1F5F9`) for structural containers to deep gunmetal slate (`#0F172A`) for high-contrast legible balance typography.

### M3 Surface Tonal Architecture
- **Surface (Canvas):** `#F8FAFC`
- **Surface Container Lowest:** `#FFFFFF` (Cards, elevated modal sheets)
- **Surface Container Low:** `#F1F5F9` (Grouped list items, inactive input chips)
- **Surface Container High:** `#E2E8F0` (Dividers, slider tracks, deactivated states)
- **On-Surface (Primary Text):** `#0F172A`
- **On-Surface Variant (Secondary Text & Labels):** `#475569`

## Typography

The type scale is executed entirely through **Roboto Flex**, offering precision tabular metrics and adjustable weights tailored for numerical ledger readability.

### Financial Readout Principles
- **Currency Glyphs (`₹`):** The Indian Rupee symbol is displayed with matching weight and slight optical kerning to prevent collision with following numerals.
- **Tabular Numerals:** All balances, transaction amounts, and timestamp columns must enable OpenType `tnum` (tabular figures) so fluctuating numbers don't trigger horizontal layout jitter during real-time updates.
- **Semantic Color Coding:** Amounts never rely on sign alone (`+`/`-`); positive inflows inherit Secondary Emerald, while outflows render in Tertiary Rose. Neutral transfers and balances use On-Surface (`#0F172A`).

## Layout & Spacing

The layout model is governed by an 8-point rhythm (with a 4-point sub-grid for tight icon-label bindings) and an adaptable fluid column strategy.

### Breakpoints & Canvas Grid
- **Compact (Mobile: 0 - 599dp):** 4-column fluid layout with `16px` (`margin`) outer gutter margin and `16px` (`gutter`) column spacing. Optimized for single-thumb ergonomics with lower-screen anchoring for the voice fab and summary cards.
- **Medium (Foldables / Tablets: 600 - 839dp):** 8-column layout with `32px` (`margin-tablet`) margins. Splits the transaction feed and analytic charts into paired functional panes.
- **Expanded (Large Tablet / Desktop: 840dp+):** 12-column layout bounded by a max width of `1040dp`, centered with `48px` (`margin-desktop`) canvas padding.

### Ergonomic Vertical Rhythm
- **Voice Action Zone:** The lower 25% of the mobile viewport is designated as the primary interaction threshold. Voice activation targets, live transcript chips, and confirmation pills must remain within natural thumb arc sweep.
- **List Density:** Transaction line items utilize strict `space-md` (`16px`) padding on the Y-axis to ensure touch targets comfortably exceed 48x48dp.

## Elevation & Depth

Visual hierarchy follows Material 3's tonal elevation system, supplemented by soft, diffused, slate-tinted ambient shadows instead of sharp structural drop-shadows.

### Surface Tiers
- **Level 0 (Base Canvas):** `#F8FAFC`. Completely flat; houses non-interactive background headers and date partition tags.
- **Level 1 (Default Containers & List Cards):** Background `#FFFFFF` with no border; elevated with an ambient shadow: `0px 1px 3px rgba(15, 23, 42, 0.05), 0px 1px 2px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Active Cards & Floating Summaries):** Background `#FFFFFF`; shadow: `0px 4px 6px -1px rgba(15, 23, 42, 0.07), 0px 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Voice Floating Action Button & Menus):** Primary Indigo or elevated card; shadow: `0px 10px 15px -3px rgba(44, 78, 207, 0.25), 0px 4px 6px -4px rgba(44, 78, 207, 0.15)`.
- **Level 4 (Modal Sheets & Live Voice Transcripts):** Background `#FFFFFF`; shadow: `0px 20px 25px -5px rgba(15, 23, 42, 0.1), 0px 8px 10px -6px rgba(15, 23, 42, 0.04)`.

### Ambient Depth Rules
Never use pure `#000000` for shadow casts. Shadows are tinted with Neutral Slate (`#0F172A`) or Primary Indigo (`#2C4ECF`) for voice-related floating triggers, producing an organic depth that integrates with surface coloring.

## Shapes

The design system employs a generous, pill-forward geometric aesthetic that feels tactile, modern, and friendly.

### Shape Scale
- **Small (`rounded` - 8px):** Selection indicators, category icons, small input chips, tooltips.
- **Medium (`rounded-md` - 12px):** Secondary buttons, inner card groupings, voice waveform bars.
- **Large (`rounded-lg` - 16px):** Primary content cards, transaction items in selected states.
- **Extra Large (`rounded-2xl` - 24px):** Main overview balance cards, top transaction sheets, modal containers.
- **Full (`rounded-full` - 9999px):** Voice trigger floating action button, filter pills, pill action buttons, user avatars.

## Components

### Buttons
- **Primary Voice FAB:** Floating pill or circle (56x56dp minimum, scaling to 64x64dp on prominent screens). Colored Primary Indigo (`#2C4ECF`) with an On-Primary (`#FFFFFF`) microphone icon. Pulse ripples utilize Primary Indigo at 12% opacity.
- **Standard Filled Buttons:** Fully rounded (`rounded-full`), height 44dp, padding `0 24px`. Background `#2C4ECF`, text `label-lg` in `#FFFFFF`.
- **Tonal Buttons:** Fully rounded, background `#EEF2FF` (Indigo Tint), text `#2C4ECF`. Used for secondary actions like "Add note" or "Split transaction".

### Chips
- **Voice Confirmation Chips:** Display detected parameters (e.g., `Category: Groceries`, `Amount: ₹450`). Height 32dp, shape `rounded-full`. Container `#F1F5F9`, border none. Left-aligned checkmark or edit pencil icon (18dp).
- **Filter Chips:** Height 32dp, shape `rounded-full`. Inactive: container `#F1F5F9`, text `#475569`. Active: container `#2C4ECF`, text `#FFFFFF`.

### Cards & Containers
- **Main Balance Card:** `rounded-2xl` (24px corner radius), background `#FFFFFF`, ambient Level 1 elevation. Padding `space-lg` (`24px`). Features total balance rendered in `display-lg-mobile` with muted slate subtext and a concise split view for total monthly income (Emerald) and expenses (Coral).
- **Transaction List Card:** Grouped inside a continuous Level 1 container or separated with clean 1dp slate dividers (`#F1F5F9`). Avoid heavy bounding outlines.

### Lists & Transaction Rows
- **Structure:** 3-column horizontal alignment:
  1. *Left:* Category circular icon badge (40x40dp, `rounded-full`, tonal background matching category).
  2. *Center:* Primary title (`title-sm`, `#0F172A`), subtitle date/merchant (`body-sm`, `#64748B`).
  3. *Right:* Amount formatted in tabular `title-md`. If positive income: `+ ₹1,200` in `#0F9D58`. If negative expense: `- ₹420` in `#E1495A`.

### Voice Input & Real-Time Waveform
- **Live Transcript Surface:** Bottom sheet sliding over base canvas with `rounded-t-2xl`. Features a dynamically expanding real-time voice waveform rendered with rounded vertical lines (`rounded-full`, 4dp width) pulsing to decibel levels in `#2C4ECF`, followed by an interim transcription label in `headline-sm` with active token highlighting.

### Input Fields & Controls
- **Manual Edit Inputs:** Filled Material 3 style with `rounded-t-lg` and flat bottom base, or fully rounded `rounded-xl` container with `#F1F5F9` background and no border. On focus, outline transitions to a 2dp solid `#2C4ECF` stroke.
- **Radio Buttons & Checkboxes:** 20x20dp, check fill using `#2C4ECF`. Unselected border in `#94A3B8` (2dp width).