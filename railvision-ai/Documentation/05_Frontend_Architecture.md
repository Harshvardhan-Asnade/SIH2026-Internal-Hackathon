# Frontend Architecture (Next.js)

The RailVision AI dashboard is built for maximum performance, responsiveness, and a premium "cinematic" user experience.

## 1. Core Frameworks
- **Next.js 16**: Utilizes the modern App Router architecture for server-side rendering, SEO optimization, and seamless page transitions.
- **React 19**: Employs the latest concurrent rendering features.
- **Tailwind CSS v4**: Provides a utility-first approach for styling the complex dashboard UI and responding to dark/light modes.

---

## 2. Global State Management (Zustand)
With dozens of AI metrics changing every frame, standard React Context would cause catastrophic re-rendering loops.

The frontend uses **Zustand** as a lightweight, bearbones state manager. 
- **Optimization Strategy**: Components utilize Zustand's `useShallow` selector pattern. 
- A heavily nested sidebar widget will *only* subscribe to `state.crowdCount` and ignore `state.activeAlerts`. This prevents parent components from unnecessarily cascading renders down the tree, allowing the UI to maintain 60fps even while the browser parses complex AI payloads.

---

## 3. Animations & Micro-interactions
The UI is designed to feel alive and dynamic.
- **GSAP (GreenSock)**: Used for complex, orchestratable timeline animations (e.g., staggering the entrance of dashboard widgets upon load).
- **Framer Motion**: Handles physics-based micro-interactions, layout transitions, and hover states for buttons and cards.
- **Lenis**: Overrides default browser scroll behavior to provide a buttery-smooth, interpolated scrolling experience across the analytics pages.

---

## 4. Analytics & Reporting
- **Recharts**: Renders real-time graphs displaying crowd trends over time, alert frequency, and worker attendance metrics.
- **jsPDF & jsPDF-AutoTable**: Allows control room operators to instantly generate and download formatted PDF executive summaries directly from the browser context without requiring a round-trip to the backend server.
