# Fluent 2 Motion System & Framer Motion — Comprehensive Reference

## Fluent v9 Native Motion APIs

### react-motion Package

The `@fluentui/react-motion` package provides the native motion system for Fluent UI v9.

#### createPresenceComponent()

Factory for creating enter/exit presence animations. Returns a React component that manages
mount/unmount transitions.

```tsx
import { createPresenceComponent, motionTokens } from '@fluentui/react-motion';

const FadeIn = createPresenceComponent({
  enter: {
    keyframes: [
      { opacity: 0 },
      { opacity: 1 },
    ],
    duration: motionTokens.durationNormal,
    easing: motionTokens.curveDecelerateMid,
  },
  exit: {
    keyframes: [
      { opacity: 1 },
      { opacity: 0 },
    ],
    duration: motionTokens.durationFast,
    easing: motionTokens.curveAccelerateMid,
  },
});

// Usage
function MyComponent({ visible }) {
  return (
    <FadeIn visible={visible}>
      <div>Content that fades in/out</div>
    </FadeIn>
  );
}
```

#### createMotionComponent()

Factory for continuous or trigger-based motion (not tied to mount/unmount).

```tsx
import { createMotionComponent, motionTokens } from '@fluentui/react-motion';

const Pulse = createMotionComponent({
  keyframes: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.05)' },
    { transform: 'scale(1)' },
  ],
  duration: motionTokens.durationSlow,
  iterations: Infinity,
});
```

### Built-in Motion Components

From `@fluentui/react-motion-components-preview`:

| Component | Description | Use Case |
|-----------|-------------|----------|
| `Collapse` | Height/width transition | Accordion panels, expandable sections |
| `Fade` | Opacity transition | Dialog backdrops, overlays |
| `Scale` | Scale transform | Dialog surfaces, popovers |

```tsx
import { Collapse, Fade, Scale } from '@fluentui/react-motion-components-preview';

// Collapse with custom options
<Collapse visible={isOpen} orientation="vertical">
  <div>Collapsible content</div>
</Collapse>

// Fade with callback
<Fade visible={isVisible} onMotionFinish={() => console.log('done')}>
  <div>Fading content</div>
</Fade>
```

### Motion Tokens

```tsx
import { tokens } from '@fluentui/react-components';

// Duration tokens (for animation timing)
tokens.durationUltraFast  // 50ms  — micro-interactions, checkmarks
tokens.durationFaster     // 100ms — button state changes, toggles
tokens.durationFast       // 150ms — hover effects, focus rings
tokens.durationNormal     // 200ms — default transition
tokens.durationGentle     // 250ms — panel reveals, card expansions
tokens.durationSlow       // 300ms — page transitions, dialogs
tokens.durationSlower     // 400ms — complex animations
tokens.durationUltraSlow  // 500ms — full-page transitions

// Easing curves
tokens.curveAccelerateMax   // cubic-bezier(1, 0, 1, 1)     — fast exit
tokens.curveAccelerateMid   // cubic-bezier(0.7, 0, 1, 0.5) — standard exit
tokens.curveAccelerateMin   // cubic-bezier(0.8, 0, 1, 1)   — subtle exit
tokens.curveDecelerateMax   // cubic-bezier(0, 0, 0, 1)     — emphatic enter
tokens.curveDecelerateMid   // cubic-bezier(0.1, 0.9, 0.2, 1) — standard enter
tokens.curveDecelerateMin   // cubic-bezier(0.33, 0, 0.1, 1)  — subtle enter
tokens.curveEasyEaseMax     // cubic-bezier(0.8, 0, 0.2, 1) — dramatic state change
tokens.curveEasyEase        // cubic-bezier(0.33, 0, 0.67, 1) — general transition
tokens.curveLinear          // cubic-bezier(0, 0, 1, 1)     — progress bars
```

### Motion Principles (Fluent 2)

1. **Purposeful** — Animation clarifies hierarchy, directs attention, provides feedback
2. **Responsive** — Transitions feel immediate (< 200ms for micro-interactions)
3. **Natural** — Decelerate on enter, accelerate on exit
4. **Consistent** — Same duration/easing for same interaction type
5. **Accessible** — Respect `prefers-reduced-motion: reduce`

### Known Motion Gaps

- RTL support for directional animations (e.g., "slide left" doesn't auto-flip)
- Motion groups/sequences API in development for choreography
- Motion docs have had Storybook rendering issues
- `onMotionFinish` being replaced with custom events for start/cancel/finish

---

## Framer Motion Integration with Fluent UI v9

### Why Pair Them

Fluent v9's native motion is ideal for simple presence transitions but limited for:
- Complex choreography (staggered groups, chained sequences)
- Physics-based spring animations
- Layout animations (smooth reordering)
- Gesture-driven interactions (drag, pan, pinch)
- Shared layout transitions (morphing between elements)

Use **Fluent motion tokens** for timing consistency; **Framer Motion** for rich animation capabilities.

### Installation

```bash
npm install framer-motion
# or
npm install motion  # motion is the newer package name (v11+)
```

---

## Framer Motion Core Concepts

### motion() Component Factory

Wraps any HTML element or React component with animation capabilities:

```tsx
import { motion } from 'framer-motion';
import { Button, Card, TableBody, TableRow } from '@fluentui/react-components';

// HTML elements
<motion.div animate={{ opacity: 1, y: 0 }} />

// Fluent components (using motion() factory)
const MotionCard = motion(Card);
const MotionTableBody = motion(TableBody);
const MotionTableRow = motion(TableRow);
const MotionButton = motion(Button);

// Usage
<MotionCard
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: [0.1, 0.9, 0.2, 1] }}
>
  <CardHeader header={<Text>Animated Card</Text>} />
</MotionCard>
```

### Animation Props

```tsx
<motion.div
  initial={{ opacity: 0, y: 20, scale: 0.95 }}   // Starting state
  animate={{ opacity: 1, y: 0, scale: 1 }}        // Target state
  exit={{ opacity: 0, y: -10, scale: 0.98 }}      // Exit state (requires AnimatePresence)
  transition={{
    duration: 0.3,
    ease: [0.1, 0.9, 0.2, 1],    // Fluent curveDecelerateMid
    delay: 0.1,
  }}
  whileHover={{ scale: 1.02, boxShadow: tokens.shadow8 }}
  whileTap={{ scale: 0.98 }}
  whileFocus={{ boxShadow: '0 0 0 2px ' + tokens.colorBrandStroke1 }}
  whileInView={{ opacity: 1 }}     // Triggers when element enters viewport
/>
```

---

## Variants System

Variants define named animation states that cascade to child components.

### Basic Variants

```tsx
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.1, 0.9, 0.2, 1], // curveDecelerateMid
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.7, 0, 1, 0.5], // curveAccelerateMid
    },
  },
};

<motion.div variants={cardVariants} initial="hidden" animate="visible" exit="exit">
  <Card>Content</Card>
</motion.div>
```

### Parent-Child Variant Propagation

When a parent uses `animate="visible"`, all children with matching variant names automatically animate:

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,    // Delay between each child
      delayChildren: 0.1,       // Delay before first child starts
      when: 'beforeChildren',   // Parent completes before children start
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.1, 0.9, 0.2, 1],
    },
  },
};

// Children automatically stagger — no need to manually set delays
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      <Card>{item.content}</Card>
    </motion.div>
  ))}
</motion.div>
```

---

## AnimatePresence — Enter/Exit Animations

### Basic Usage

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function NotificationList({ notifications }) {
  return (
    <AnimatePresence mode="popLayout">
      {notifications.map((n) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{
            opacity: 1,
            height: 'auto',
            marginBottom: 12,
            transition: { duration: 0.3, ease: [0.1, 0.9, 0.2, 1] },
          }}
          exit={{
            opacity: 0,
            height: 0,
            marginBottom: 0,
            transition: { duration: 0.2, ease: [0.7, 0, 1, 0.5] },
          }}
        >
          <MessageBar intent={n.intent}>
            <MessageBarBody>{n.message}</MessageBarBody>
          </MessageBar>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

### AnimatePresence Modes

- `"sync"` (default): New and old elements animate simultaneously
- `"wait"`: Old element completes exit before new element enters
- `"popLayout"`: Old element removed from layout flow immediately

### onExitComplete Callback

```tsx
<AnimatePresence onExitComplete={() => {
  // Called when all exiting elements finish
  scrollToTop();
}}>
  {/* ... */}
</AnimatePresence>
```

---

## Staggered List and Table Animations

### Staggered Card Grid

```tsx
import { motion } from 'framer-motion';
import { Card, CardHeader, Text, tokens } from '@fluentui/react-components';

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.1, 0.9, 0.2, 1], // curveDecelerateMid
    },
  },
};

function AnimatedCardGrid({ items }) {
  return (
    <motion.div
      className={styles.grid}
      variants={gridVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.div key={item.id} variants={cardVariants}>
          <Card>
            <CardHeader header={<Text weight="semibold">{item.title}</Text>} />
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

### Staggered DataGrid Rows

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableBody, TableRow, TableCell } from '@fluentui/react-components';

const MotionTableBody = motion(TableBody);
const MotionTableRow = motion(TableRow);

const bodyVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: [0.2, 0, 0, 1] },
  },
  exit: {
    opacity: 0,
    x: 8,
    transition: { duration: 0.15, ease: [0.7, 0, 1, 0.5] },
  },
};

function AnimatedDataTable({ data, filterKey }) {
  return (
    <Table>
      <MotionTableBody
        key={filterKey}  // Change key to retrigger stagger on filter/sort
        variants={bodyVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {data.map((item) => (
            <MotionTableRow key={item.id} variants={rowVariants} exit="exit" layout>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.status}</TableCell>
            </MotionTableRow>
          ))}
        </AnimatePresence>
      </MotionTableBody>
    </Table>
  );
}
```

---

## Layout Animations

### Automatic Layout Animation

The `layout` prop enables smooth transitions when an element's position or size changes:

```tsx
// Cards that smoothly reorder when filtered
<motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
  <Card>{content}</Card>
</motion.div>

// Layout modes
<motion.div layout />           // Animate position AND size
<motion.div layout="position" /> // Animate position only
<motion.div layout="size" />     // Animate size only
```

### layoutId — Shared Layout Transitions

Elements with the same `layoutId` morph into each other:

```tsx
function CardList({ items, selectedId, onSelect }) {
  return (
    <>
      <div className={styles.grid}>
        {items.map((item) => (
          <motion.div key={item.id} layoutId={`card-${item.id}`} onClick={() => onSelect(item.id)}>
            <Card>
              <Text>{item.title}</Text>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            layoutId={`card-${selectedId}`}
            className={styles.expandedCard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardHeader header={<Text size={600}>{selected.title}</Text>} />
              <p>{selected.details}</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

### LayoutGroup

Isolate layout animations to prevent cross-contamination:

```tsx
import { LayoutGroup } from 'framer-motion';

<LayoutGroup id="sidebar">
  {/* Layout animations here won't affect elements outside this group */}
  <motion.div layout>{/* ... */}</motion.div>
</LayoutGroup>
```

---

## Spring Physics

### Spring Transition

```tsx
<motion.div
  animate={{ x: 100 }}
  transition={{
    type: 'spring',
    stiffness: 300,    // Higher = snappier (default: 100)
    damping: 20,       // Higher = less bouncy (default: 10)
    mass: 1,           // Higher = heavier feel (default: 1)
    velocity: 0,       // Initial velocity
    restDelta: 0.01,   // Minimum distance to consider "at rest"
    restSpeed: 0.01,   // Minimum speed to consider "at rest"
  }}
/>

// Simplified spring presets
<motion.div transition={{ type: 'spring', bounce: 0.25 }} />
// bounce: 0 = no bounce (critically damped), 1 = maximum bounce

// Duration-based spring (easier to predict)
<motion.div transition={{
  type: 'spring',
  duration: 0.5,      // Target duration in seconds
  bounce: 0.2,        // 0-1 bounce amount
}} />
```

### Recommended Spring Configs for Fluent UI

| Context | Config | Feel |
|---------|--------|------|
| Micro-interactions (button press) | `stiffness: 500, damping: 30` | Snappy, no bounce |
| Card hover lift | `stiffness: 300, damping: 25` | Quick, slight overshoot |
| Dialog entrance | `stiffness: 200, damping: 20` | Smooth, gentle settle |
| Drawer slide | `stiffness: 250, damping: 25, mass: 0.8` | Responsive, clean stop |
| List reorder | `stiffness: 400, damping: 28` | Fast, minimal bounce |
| Page transition | `stiffness: 150, damping: 18` | Smooth, noticeable ease |
| Tooltip appear | `stiffness: 600, damping: 35` | Near-instant |

---

## Gesture Animations

### Drag

```tsx
<motion.div
  drag           // Enable both axes
  drag="x"       // Constrain to horizontal
  drag="y"       // Constrain to vertical
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
  dragElastic={0.2}      // 0 = hard stop, 1 = full elastic (default 0.35)
  dragMomentum={true}    // Continue after release (default true)
  dragTransition={{
    bounceStiffness: 300,
    bounceDamping: 20,
  }}
  onDragStart={(event, info) => {}}
  onDrag={(event, info) => {
    // info.point.x, info.point.y — current position
    // info.delta.x, info.delta.y — change since last frame
    // info.offset.x, info.offset.y — total offset from start
    // info.velocity.x, info.velocity.y — current velocity
  }}
  onDragEnd={(event, info) => {
    // Use velocity to determine action (dismiss, snap, etc.)
    if (info.velocity.x > 500) dismissCard();
  }}
  whileDrag={{ scale: 1.05, boxShadow: tokens.shadow16 }}
/>
```

### Drag with Constraints Ref

```tsx
const constraintsRef = useRef(null);

<div ref={constraintsRef} className={styles.dragArea}>
  <motion.div
    drag
    dragConstraints={constraintsRef}
    dragElastic={0.1}
  >
    <Card>Drag me within the container</Card>
  </motion.div>
</div>
```

### Swipe-to-Dismiss Pattern

```tsx
function SwipeableCard({ onDismiss, children }) {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 150 || Math.abs(info.velocity.x) > 500) {
          onDismiss();
        }
      }}
      animate={{ x: 0 }}
      exit={{
        x: info => info.offset.x > 0 ? 300 : -300,
        opacity: 0,
        transition: { duration: 0.2 },
      }}
    >
      <Card>{children}</Card>
    </motion.div>
  );
}
```

---

## Scroll-Linked Animations

### useScroll Hook

```tsx
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

function ParallaxHeader() {
  const { scrollY } = useScroll();

  // Transform scroll position to opacity and scale
  const headerOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const headerScale = useTransform(scrollY, [0, 200], [1, 0.95]);
  const headerY = useTransform(scrollY, [0, 200], [0, -50]);

  // Smooth the values with spring physics
  const smoothOpacity = useSpring(headerOpacity, { stiffness: 100, damping: 20 });

  return (
    <motion.div
      style={{
        opacity: smoothOpacity,
        scale: headerScale,
        y: headerY,
      }}
      className={styles.hero}
    >
      <Text size={900} weight="semibold">Welcome</Text>
    </motion.div>
  );
}
```

### Scroll Progress Indicator

```tsx
function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      style={{
        scaleX: scrollYProgress,
        transformOrigin: '0%',
        height: '3px',
        backgroundColor: tokens.colorBrandBackground,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    />
  );
}
```

### Element-Level Scroll Tracking

```tsx
function RevealOnScroll({ children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],  // When element enters/exits viewport
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.3], [50, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}
```

---

## useMotionValue and useTransform

### Custom Motion Values

```tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';

function InteractiveCard() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Derived values
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);
  const brightness = useTransform(y, [-100, 0, 100], [1.1, 1, 0.9]);

  return (
    <motion.div
      style={{ x, y, rotateX, rotateY, filter: `brightness(${brightness})` }}
      drag
      dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
      dragElastic={0.15}
    >
      <Card>
        <CardHeader header={<Text weight="semibold">3D Card</Text>} />
      </Card>
    </motion.div>
  );
}
```

### Chained Transforms

```tsx
const x = useMotionValue(0);
const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
const rotate = useTransform(x, [-200, 200], [-15, 15]);
const backgroundColor = useTransform(
  x,
  [-200, 0, 200],
  [tokens.colorStatusDangerBackground3, tokens.colorNeutralBackground1, tokens.colorStatusSuccessBackground3]
);
```

---

## useAnimate — Imperative Animations

```tsx
import { useAnimate, stagger } from 'framer-motion';

function AnimatedList() {
  const [scope, animate] = useAnimate();

  const handleEnter = async () => {
    // Animate multiple elements imperatively
    await animate('li', { opacity: 1, y: 0 }, {
      duration: 0.3,
      delay: stagger(0.05),
      ease: [0.1, 0.9, 0.2, 1],
    });

    // Chain another animation
    await animate('.highlight', { backgroundColor: tokens.colorBrandBackground2 }, {
      duration: 0.5,
    });
  };

  return (
    <div ref={scope}>
      <Button onClick={handleEnter}>Animate List</Button>
      <ul>
        {items.map((item) => (
          <motion.li key={item.id} initial={{ opacity: 0, y: 12 }}>
            {item.name}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
```

### Sequence Animations

```tsx
const [scope, animate] = useAnimate();

async function runSequence() {
  // Step 1: Fade in backdrop
  await animate('.backdrop', { opacity: 1 }, { duration: 0.2 });

  // Step 2: Scale in dialog
  await animate('.dialog', { opacity: 1, scale: 1 }, {
    duration: 0.3,
    ease: [0.1, 0.9, 0.2, 1],
  });

  // Step 3: Stagger in content items
  await animate('.content-item', { opacity: 1, y: 0 }, {
    duration: 0.2,
    delay: stagger(0.05),
  });
}
```

---

## Complex Choreography Patterns

### Multi-Stage Page Transition

```tsx
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.1, 0.9, 0.2, 1],
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.7, 0, 1, 0.5],
      when: 'afterChildren',
      staggerChildren: 0.03,
      staggerDirection: -1, // Reverse stagger on exit
    },
  },
};

const sectionVariants = {
  initial: { opacity: 0, y: 16 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.1, 0.9, 0.2, 1],
      staggerChildren: 0.05,
    },
  },
  exit: { opacity: 0, y: -8 },
};

const itemVariants = {
  initial: { opacity: 0, x: -8 },
  enter: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
};
```

### Orchestrated Dashboard Animation

```tsx
function AnimatedDashboard({ data }) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const sequence = async () => {
      // 1. Header slides down
      await animate('.header', { opacity: 1, y: 0 }, {
        duration: 0.3,
        ease: [0.1, 0.9, 0.2, 1],
      });

      // 2. Metric cards stagger in
      await animate('.metric-card', { opacity: 1, y: 0, scale: 1 }, {
        duration: 0.25,
        delay: stagger(0.08),
        ease: [0.1, 0.9, 0.2, 1],
      });

      // 3. Main content fades in
      await animate('.main-content', { opacity: 1 }, { duration: 0.3 });

      // 4. Sidebar slides in
      animate('.sidebar', { opacity: 1, x: 0 }, {
        duration: 0.35,
        ease: [0.1, 0.9, 0.2, 1],
      });
    };

    sequence();
  }, [data]);

  return (
    <div ref={scope}>
      <motion.div className="header" initial={{ opacity: 0, y: -20 }}>
        <Text size={600} weight="semibold">Dashboard</Text>
      </motion.div>

      <div className={styles.metricsRow}>
        {metrics.map((m) => (
          <motion.div key={m.id} className="metric-card" initial={{ opacity: 0, y: 16, scale: 0.95 }}>
            <Card>{m.content}</Card>
          </motion.div>
        ))}
      </div>

      <motion.div className="main-content" initial={{ opacity: 0 }}>
        {/* Main content */}
      </motion.div>

      <motion.div className="sidebar" initial={{ opacity: 0, x: 40 }}>
        {/* Sidebar */}
      </motion.div>
    </div>
  );
}
```

---

## Reduced Motion Support

### Automatic Detection

```tsx
import { useReducedMotion } from 'framer-motion';

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion
        ? { duration: 0 }
        : { duration: 0.3, ease: [0.1, 0.9, 0.2, 1] }
      }
    >
      <Card>Content</Card>
    </motion.div>
  );
}
```

### Global Reduced Motion Config

```tsx
import { MotionConfig } from 'framer-motion';

// Wrap entire app to globally reduce motion
function App() {
  return (
    <MotionConfig reducedMotion="user">
      {/* "user" respects prefers-reduced-motion */}
      {/* "always" forces reduced motion */}
      {/* "never" ignores preference */}
      <FluentProvider theme={webLightTheme}>
        <YourApp />
      </FluentProvider>
    </MotionConfig>
  );
}
```

---

## Performance Best Practices

### GPU-Accelerated Properties

Only animate transform and opacity for 60fps. These properties are GPU-accelerated:
- `x`, `y`, `z` (translate)
- `scale`, `scaleX`, `scaleY`
- `rotate`, `rotateX`, `rotateY`, `rotateZ`
- `opacity`
- `skew`, `skewX`, `skewY`

**Avoid animating**: `width`, `height`, `top`, `left`, `backgroundColor`, `borderRadius`, `padding`, `margin`.
If needed, use `layout` prop instead — Framer Motion uses FLIP technique.

### willChange Management

Framer Motion automatically adds `will-change: transform` during animation and removes it after.

### Memoization with Motion Components

```tsx
const MotionCard = memo(motion(Card));

// Pre-compute variants outside component
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.1, 0.9, 0.2, 1] } },
};

// Use stable references
function OptimizedList({ items }) {
  return items.map((item) => (
    <MotionCard key={item.id} variants={cardVariants} layout>
      {item.content}
    </MotionCard>
  ));
}
```

### LazyMotion for Bundle Size

```tsx
import { LazyMotion, domAnimation, m } from 'framer-motion';

// Reduces bundle by loading only needed features
function App() {
  return (
    <LazyMotion features={domAnimation}>
      {/* Use m.div instead of motion.div */}
      <m.div animate={{ opacity: 1 }}>Content</m.div>
    </LazyMotion>
  );
}

// For full features (gestures, layout, etc.):
import { domMax } from 'framer-motion';
<LazyMotion features={domMax}>{/* ... */}</LazyMotion>
```

---

## Token Pipeline for Motion

### Mapping Fluent Tokens to Framer Motion

```tsx
// Helper to convert Fluent easing strings to Framer Motion arrays
const fluentEasings = {
  decelerateMid: [0.1, 0.9, 0.2, 1],
  decelerateMax: [0, 0, 0, 1],
  decelerateMin: [0.33, 0, 0.1, 1],
  accelerateMid: [0.7, 0, 1, 0.5],
  accelerateMax: [1, 0, 1, 1],
  accelerateMin: [0.8, 0, 1, 1],
  easyEase: [0.33, 0, 0.67, 1],
  easyEaseMax: [0.8, 0, 0.2, 1],
};

// Helper to convert Fluent duration tokens to seconds
const fluentDurations = {
  ultraFast: 0.05,
  faster: 0.1,
  fast: 0.15,
  normal: 0.2,
  gentle: 0.25,
  slow: 0.3,
  slower: 0.4,
  ultraSlow: 0.5,
};

// Pre-built transition presets
export const fluentTransitions = {
  enter: {
    duration: fluentDurations.normal,
    ease: fluentEasings.decelerateMid,
  },
  exit: {
    duration: fluentDurations.fast,
    ease: fluentEasings.accelerateMid,
  },
  stateChange: {
    duration: fluentDurations.fast,
    ease: fluentEasings.easyEase,
  },
  pageTransition: {
    duration: fluentDurations.slow,
    ease: fluentEasings.decelerateMid,
  },
  microInteraction: {
    duration: fluentDurations.faster,
    ease: fluentEasings.easyEase,
  },
  springSnappy: {
    type: 'spring',
    stiffness: 500,
    damping: 30,
  },
  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 20,
  },
};
```

---

## Complete Example: Animated App Shell

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import {
  FluentProvider, webLightTheme, makeStyles, tokens,
  Card, CardHeader, Text, Button, Avatar, Badge,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  shell: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gridTemplateColumns: '260px 1fr',
    gridTemplateAreas: '"header header" "nav main"',
    height: '100vh',
  },
  header: {
    gridArea: 'header',
    padding: `0 ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    height: '48px',
  },
  nav: {
    gridArea: 'nav',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingVerticalS,
  },
  main: {
    gridArea: 'main',
    padding: tokens.spacingHorizontalXXL,
    overflowY: 'auto',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
});

const shellVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const panelVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.1, 0.9, 0.2, 1] },
  },
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.1, 0.9, 0.2, 1] },
  },
};

function AnimatedAppShell({ items }) {
  const styles = useStyles();

  return (
    <FluentProvider theme={webLightTheme}>
      <motion.div
        className={styles.shell}
        variants={shellVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className={styles.header} variants={panelVariants}>
          <Text size={500} weight="semibold">Dashboard</Text>
        </motion.div>

        <motion.nav className={styles.nav} variants={panelVariants}>
          {/* Navigation items */}
        </motion.nav>

        <motion.main className={styles.main} variants={contentVariants}>
          <div className={styles.cardGrid}>
            <AnimatePresence>
              {items.map((item) => (
                <motion.div key={item.id} variants={cardVariants} layout>
                  <Card>
                    <CardHeader
                      image={<Avatar name={item.author} />}
                      header={<Text weight="semibold">{item.title}</Text>}
                      description={<Badge>{item.status}</Badge>}
                    />
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.main>
      </motion.div>
    </FluentProvider>
  );
}
```
