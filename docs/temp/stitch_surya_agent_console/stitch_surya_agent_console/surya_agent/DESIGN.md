---
name: SURYA AGENT
colors:
  surface: '#0e1513'
  surface-dim: '#0e1513'
  surface-bright: '#343b38'
  surface-container-lowest: '#09100e'
  surface-container-low: '#161d1b'
  surface-container: '#1a211f'
  surface-container-high: '#242b29'
  surface-container-highest: '#2f3634'
  on-surface: '#dde4e0'
  on-surface-variant: '#bbcac4'
  inverse-surface: '#dde4e0'
  inverse-on-surface: '#2b3230'
  outline: '#85948f'
  outline-variant: '#3c4a46'
  surface-tint: '#44ddc1'
  primary: '#44ddc1'
  on-primary: '#00382f'
  primary-container: '#00bfa5'
  on-primary-container: '#00473c'
  inverse-primary: '#006b5c'
  secondary: '#bbc8d0'
  on-secondary: '#263238'
  secondary-container: '#3c494f'
  on-secondary-container: '#aab7bf'
  tertiary: '#ffb4a1'
  on-tertiary: '#601401'
  tertiary-container: '#fe896a'
  on-tertiary-container: '#74220b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#68fadd'
  primary-fixed-dim: '#44ddc1'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#005145'
  secondary-fixed: '#d7e4ec'
  secondary-fixed-dim: '#bbc8d0'
  on-secondary-fixed: '#111d23'
  on-secondary-fixed-variant: '#3c494f'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#7f2a13'
  background: '#0e1513'
  on-background: '#dde4e0'
  surface-variant: '#2f3634'
typography:
  metric-xl:
    fontFamily: JetBrains Mono
    fontSize: 52px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  metric-lg:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-section:
    fontFamily: Archivo Narrow
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.15em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caption-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  panel-padding: 12px
  stack-tight: 4px
  stack-md: 8px
---

## Brand & Style
The design system is an industrial-grade interface built for high-stakes solar energy monitoring. It adopts a **Modern Industrial / Brutalist** aesthetic, prioritizing data density and cognitive clarity over decorative flourishes. The interface serves expert operators in a dark-room environment, requiring high legibility and instant recognition of severity through color.

The design language is defined by:
- **Flat Slabs:** Content is organized into structural tiers using 1px hairlines and solid backgrounds; elements never float or cast shadows.
- **Data Primacy:** Quantitative values are the primary visual anchors, designed to be read from a distance.
- **Zero-Distraction:** No gradients, no blurs, and no unnecessary animations. Every pixel must serve a functional purpose.

## Colors
This design system utilizes a high-contrast dark theme. The background is a "Deep Space" blue-black to minimize eye strain and screen glare in control rooms.

### Severity Ramp (Ironbow Inspired)
- **Primary/Action:** Bright Teal (#00bfa5) is reserved for interactive elements and active status indicators.
- **Normal State:** Dull Blue (#263238) is the baseline; it is intended to recede into the background, allowing anomalies to pop.
- **Alert Tiers:** Escalates from Deep Purple (Info) through Orange (Warning) and Red (Critical) to Amber (Peak) and Near-White (Max/Extreme). Use these colors sparingly for maximum impact.

## Typography
Typography is split into three functional roles:
1.  **Quantitative (JetBrains Mono):** All numerical data, sensor readings, and IDs must use monospaced fonts with tabular figures to ensure columns of numbers align perfectly for easy scanning.
2.  **Structural (Archivo Narrow):** Headings and button labels use a condensed sans-serif in ALL CAPS with wide tracking (0.15em). This creates clear horizontal breaks between data sets.
3.  **Descriptive (Inter):** General prose and system messages use a standard sans-serif for optimal legibility at small sizes.

**Scale:** Maintain a 4:1 ratio between Metrics (e.g., 52px) and their descriptive captions (e.g., 12px) to establish a clear information hierarchy.

## Layout & Spacing
The layout is a **Fixed 1920x1080 Grid** designed for large-format control room displays. 

- **Grid:** Use a 12-column system with 16px gutters. Panels should snap to the grid.
- **Density:** Padding within panels is kept tight (12px) to maximize the amount of information displayed per screen.
- **Vertical Rhythm:** Group metrics with their labels using a 4px (tight) stack. Group separate data blocks using 16px or 24px vertical gaps.
- **Separators:** Use 1px borders (#1e293b) to define panel boundaries. Avoid using margins between panels where a shared border suffices, creating a "tiled slab" look.

## Elevation & Depth
This design system is strictly **Flat**. There are no shadows or Z-axis depth cues.
- **Tiers:** Use background color shifts to denote hierarchy. A slightly lighter gray (#0f172a) can be used to highlight an "active" panel against the base background (#05070a).
- **Borders:** Depth is represented through 1px "hairline" strokes. Use a dimmer stroke for secondary containers and a brighter Teal (#00bfa5) stroke only for focused or active states.
- **Selection:** Indicated by a solid color block behind text or a high-contrast border, never a drop shadow.

## Shapes
The shape language is **geometric and sharp**.
- **Corners:** Radius is 0px by default. For internal UI elements like buttons or input fields, a maximum radius of 2px is permitted to avoid a "jagged" look on lower-resolution monitors.
- **Consistency:** All containers, progress bars, and status indicators must maintain 90-degree angles to reinforce the industrial, hardware-like feel of the software.

## Components
- **Buttons:** Solid #263238 background with Archivo Narrow ALL CAPS text. Primary actions use the Teal (#00bfa5) background with black text. No hover transitions; state changes should be instantaneous.
- **Metrics/KPIs:** Large JetBrains Mono figures over a small caption. If the value is in an alert state, the number itself (or a small 8px bar next to it) should change to the corresponding Severity color.
- **Status Chips:** Small, rectangular blocks with 0px radius. Use the Severity ramp for fill colors. Text inside chips should be JetBrains Mono 10px.
- **Input Fields:** 1px #263238 border. Background is #0a0f14 (slightly lighter than page). No focus glow—use a 1px Teal border for focus.
- **Data Tables:** High density. No row stripes. Use 1px horizontal dividers only. Header text must be Archivo Narrow, ALL CAPS, 11px.
- **Charts:** Use thin 1px lines for line charts. Fills should be 10% opacity version of the line color. No smoothed curves; use straight-line paths only.