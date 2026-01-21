UI Design Specification: RecoveryLM (v1.0)

Document Status: Draft v1.0
Related Artifacts: RecoveryLM.tsx (Interactive Mockup), independent-recovery-framework.pdf

1. Design Philosophy

RecoveryLM is not a "wellness app" with soft gradients and pastel tones. It is a "Command Center" for the mind. The aesthetic must reflect the Independent Recovery Framework (IRF): systematic, martial, disciplined, and private.

Tone: "Martial Stoicism." Clean, dark, high-contrast, free of distraction.

Metaphor: The Cockpit. Data is dense but organized. Controls are rigid.

Privacy: The visual language should feel "encrypted"—solid borders, contained data, local-first vibes.

2. Visual Identity & Style Guide

2.1 Color Palette (Tailwind CSS Mapping)

The application uses a strict Dark Mode Only palette to reduce eye strain and maintain the "Command Center" feel.

Base Neutral (The Structure)

Used for backgrounds, borders, and text hierarchy.

Canvas (App Background): Slate-950 (#020617) - Deepest depth.

Surface 1 (Sidebar/Header): Slate-900 (#0f172a) - Structural containers.

Surface 2 (Cards/Inputs): Slate-800 (#1e293b) - Interactive layers.

Border/Divider: Slate-700 (#334155) - Definition lines.

Semantic Colors (The Signal)

Used sparingly to indicate status. Never used for decoration.

Primary Action (Remi/Focus): Indigo-600 (#4f46e5) - Chat bubbles, Send buttons.

Growth/Stability (Green): Emerald-400 (#34d399) - Sobriety streaks, completed tasks.

Warning/Risk (Amber): Amber-500 (#f59e0b) - Leading indicators, missed habits.

Crisis/Danger (Red): Red-500 (#ef4444) / Red-900 (Backgrounds) - SOS button, Relapse.

2.2 Typography

Primary Font: System Sans (Inter, SF Pro, Segoe UI).

Usage: UI text, chat messages, labels.

Secondary Font: Monospace (JetBrains Mono, Roboto Mono, or System Mono).

Usage: Timers (DENTS), Metrics, Timestamps, "System Online" status.

Hierarchy:

H1 (Page Title): 20px / Bold / Tracking-Tight.

H2 (Section Header): 16px / SemiBold / Uppercase / Tracking-Wide.

Body: 14px / Regular / Slate-300.

Caption/Label: 12px / Medium / Slate-500.

2.3 Iconography

Library: Lucide React (Stroke width: 2px).

Size Standard:

Small (inline): 16px.

Medium (buttons/tabs): 18px-20px.

Large (empty states): 48px.

3. Component Architecture (Atomic Design)

3.1 Buttons & Controls

Primary Button:

bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-lg.

Used for: "Send Message", "Save Entry".

Secondary Button:

bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700.

Used for: Navigation tabs, Cancel actions.

Destructive/SOS Button:

bg-red-900/20 text-red-500 border-red-900/50 hover:bg-red-600 hover:text-white.

Requirement: Must be visible on every screen (Top Right).

3.2 Cards & Containers

Dashboard Card:

bg-slate-800 border-slate-700 rounded-lg.

Padding: 16px (Mobile) / 24px (Desktop).

Chat Bubble (User):

bg-indigo-600 text-white rounded-2xl rounded-tr-sm.

Chat Bubble (AI/System):

bg-slate-800 text-slate-200 border-slate-700 rounded-2xl rounded-tl-sm.

3.3 Generative UI Widgets (Interactive Embeds)

These widgets appear inside the chat stream. They must look distinct from standard text bubbles.

Container Style: bg-slate-800 border-indigo-500/30 shadow-lg my-3.

Header: Flex row, Icon + Title (Bold Indigo-400), Right-aligned Timer/Status.

Interaction:

Checkboxes must use cursor-pointer and distinct active/inactive states.

Checked state: line-through text-slate-500 bg-slate-700/50.

3.4 Metrics & Activities Components

The components are split into Action (Activities) and Analysis (Metrics).

The Daily Register (Habit Tracker - Action):

Visual: A row-based list. Left: Label + Streak Count. Right: Large Toggle Button.

Toggle Logic: * Unchecked: border-slate-600 bg-transparent.

Checked: bg-emerald-500 border-emerald-500 text-white.

Sync Rule: Toggling here immediately updates the DailyMetric store, which the Chat Widget will reflect if opened later.

Activity Launch Cards (Tools - Action):

Style: Grid of clickable cards.

Content: Icon (Top Left), Title (Bold), Description (Small, Slate-400), "Launch" Action Text.

Hover State: hover:border-indigo-500 hover:bg-slate-750.

Activities Included: DENTS Protocol, Play the Tape, Cost/Benefit, Stoic Review.

Streak Heatmap (Insights - Analysis):

Visual: A row of small squares representing the last 30-90 days (GitHub Style).

States:

Empty: bg-slate-800.

Success: bg-emerald-500.

Missed: bg-slate-700 (or bg-red-900 if critical habit).

4. Layout & Grid System

4.1 Desktop (The Command Center)

Layout: Three-column or Split View.

Sidebar (Nav): Fixed width (250px).

Main Content (Dashboard/Chat): Fluid fill.

Context Panel (Optional): Right sidebar for "Metrics History" or "Support Network".

Max Width: Content within the main area should be constrained to max-w-5xl for readability.

4.2 Mobile (The Field Unit)

Navigation: Bottom Tab Bar (h-16 bg-slate-900 border-t-slate-800).

Header: Simple top bar with Hamburger Menu (Left) and SOS (Right).

Safe Areas: Ensure padding accommodates iOS Home Indicator and Android notches.

4.3 Activities View (Action Layout)

Header Area: Date Picker (default: Today) + "Complete Check-in" Primary Button.

Section 1: The Register: Vertical list of all active habits defined in the User Profile. Prioritizes items not yet completed today.

Section 2: Activity Library: 2-column grid (Mobile) / 3-column grid (Desktop) of Activity Launch Cards.

4.4 Metrics View (Analysis Layout)

Header Area: Date Range Picker (Week/Month/Year).

Section 1: Streak Heatmaps: A separate heatmap row for each tracked habit (Sobriety, Exercise, Meditation).

Section 2: Insights Charts: * Mood vs. Sobriety: Line chart overlaying mood score (1-10) with sobriety status.

Trigger Frequency: Bar chart showing count of logged triggers by type (e.g., "Stress", "Social", "Boredom").

Section 3: Detailed Logs: A reverse-chronological list of all journal entries and metric logs, filterable by tag.

4.5 Guided Journal View (Reflection Layout)

Layout Structure:

Left/Top (Template Selector): List of available frameworks (Morning Stoic Prep, Evening Review, CBT Analysis, Freeform).

Right/Bottom (Editor Area): Distraction-free writing surface.

The Editor Interface:

Prompt Header: Static text block at top explaining the exercise (e.g., "What is within your control right now?").

Text Area: Minimalist, bg-slate-900 input area with text-slate-200 and generous line-height.

"Analyze with Remi" Action: Primary button below the editor. When clicked, it sends the entry to AI for feedback/analysis, transitioning the user to the Chat View with the analysis results.

History/Archives:

Accessed via a secondary tab "Past Entries".

Displayed as a masonry grid of cards.

Each card shows: Date, Template Used, Mood Score (if applicable), and auto-generated "Summary Tags" (e.g., #Anxiety, #Win).

5. Interaction Patterns & States

5.1 The "Crisis Gate"

Trigger: User types self-harm keywords or presses SOS.

State: Full-screen Modal overlay.

Visuals: Darkened backdrop (bg-black/90), Red accent border, large clear text.

Actions: "Call Emergency Contact" (Primary, Large), "Call 988/Crisis Line".

5.2 Leading Indicator Warning

Trigger: >2 days missed habits.

Visuals: bg-amber-900/20 border-amber-600/30.

Icon: Alert Triangle (Amber-500).

Tone: "Risk Analysis" not "You Failed". Use data-driven language.

5.3 Loading States

Chat Typing: Three-dot pulse animation within a Slate-800 bubble.

Widget Generation: "Analyzing intent..." skeleton loader before the DENTS/Tape widget snaps in.

6. Accessibility Standards (WCAG AA)

Contrast: Ensure Slate-400 text on Slate-900 background meets 4.5:1 ratio.

Focus Rings: All interactive elements must have a visible focus ring (ring-2 ring-indigo-500) for keyboard navigation.

Touch Targets: Mobile buttons must be min 44x44px.

Screen Readers:

Timers (DENTS) must announce updates at intervals, not every second.

Icons must have aria-label or be hidden aria-hidden="true".

7. Developer Handoff Notes

React Implementation: Use the RecoveryLM.tsx mockup as the reference implementation for component structure.

Icon Library: lucide-react is the required dependency.

CSS Framework: Tailwind CSS is mandatory for the utility classes specified above.

Animation: Use tailwindcss-animate for fade-ins and slide-overs.