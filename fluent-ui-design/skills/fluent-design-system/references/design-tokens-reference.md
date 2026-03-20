# Fluent 2 Design Tokens — Complete Reference

## Token Naming Convention

Fluent 2 tokens follow a structured naming pattern:

```
{category}{Property}{Variant}{State}
```

Examples:
- `colorNeutralBackground1` → category: color, property: Neutral, variant: Background, state: 1
- `colorBrandForegroundLink` → category: color, property: Brand, variant: Foreground, state: Link
- `spacingHorizontalM` → category: spacing, direction: Horizontal, size: M

---

## Color Tokens — Full Catalog

### Neutral Background Tokens

| Token | Light Theme | Dark Theme | Usage |
|---|---|---|---|
| `colorNeutralBackground1` | `#FFFFFF` | `#292929` | Primary surface |
| `colorNeutralBackground1Hover` | `#F5F5F5` | `#3D3D3D` | Hover on primary surface |
| `colorNeutralBackground1Pressed` | `#E0E0E0` | `#1F1F1F` | Pressed on primary surface |
| `colorNeutralBackground1Selected` | `#EBEBEB` | `#383838` | Selected on primary surface |
| `colorNeutralBackground2` | `#FAFAFA` | `#1F1F1F` | Secondary surface |
| `colorNeutralBackground2Hover` | `#F0F0F0` | `#383838` | Hover on secondary |
| `colorNeutralBackground2Pressed` | `#DBDBDB` | `#1A1A1A` | Pressed on secondary |
| `colorNeutralBackground2Selected` | `#E6E6E6` | `#333333` | Selected on secondary |
| `colorNeutralBackground3` | `#F5F5F5` | `#141414` | Tertiary surface |
| `colorNeutralBackground3Hover` | `#EBEBEB` | `#333333` | Hover on tertiary |
| `colorNeutralBackground3Pressed` | `#D6D6D6` | `#0F0F0F` | Pressed on tertiary |
| `colorNeutralBackground3Selected` | `#E0E0E0` | `#2E2E2E` | Selected on tertiary |
| `colorNeutralBackground4` | `#F0F0F0` | `#0A0A0A` | Quaternary surface |
| `colorNeutralBackground4Hover` | `#FAFAFA` | `#1F1F1F` | Hover on quaternary |
| `colorNeutralBackground4Pressed` | `#F5F5F5` | `#050505` | Pressed on quaternary |
| `colorNeutralBackground4Selected` | `#FFFFFF` | `#1A1A1A` | Selected on quaternary |
| `colorNeutralBackground5` | `#EBEBEB` | `#0A0A0A` | Quinary surface |
| `colorNeutralBackground5Selected` | `#DBDBDB` | `#141414` | Selected on quinary |
| `colorNeutralBackground6` | `#E6E6E6` | `#0A0A0A` | Senary surface |
| `colorNeutralBackgroundInverted` | `#292929` | `#FFFFFF` | Inverted surface |
| `colorNeutralBackgroundInvertedDisabled` | `#DBDBDB` | `#DBDBDB` | Disabled inverted |
| `colorNeutralBackgroundStatic` | `#333333` | `#333333` | Static (no theme change) |
| `colorNeutralBackgroundAlpha` | `rgba(255,255,255,0.5)` | `rgba(26,26,26,0.5)` | Semi-transparent |
| `colorNeutralBackgroundAlpha2` | `rgba(255,255,255,0.8)` | `rgba(26,26,26,0.7)` | Semi-transparent 2 |

### Subtle Background Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `colorSubtleBackground` | transparent | transparent | Transparent at rest |
| `colorSubtleBackgroundHover` | `#F5F5F5` | `#383838` | Appears on hover |
| `colorSubtleBackgroundPressed` | `#E0E0E0` | `#1F1F1F` | Pressed state |
| `colorSubtleBackgroundSelected` | `#EBEBEB` | `#333333` | Selected state |
| `colorSubtleBackgroundLightAlphaHover` | `rgba(255,255,255,0.7)` | — | Light subtle hover |
| `colorSubtleBackgroundLightAlphaPressed` | `rgba(255,255,255,0.5)` | — | Light subtle pressed |
| `colorSubtleBackgroundLightAlphaSelected` | transparent | — | Light subtle selected |
| `colorSubtleBackgroundInvertedHover` | `rgba(0,0,0,0.06)` | — | Inverted subtle hover |
| `colorSubtleBackgroundInvertedPressed` | `rgba(0,0,0,0.12)` | — | Inverted subtle pressed |
| `colorSubtleBackgroundInvertedSelected` | `rgba(0,0,0,0.06)` | — | Inverted subtle selected |
| `colorTransparentBackground` | transparent | transparent | Fully transparent |
| `colorTransparentBackgroundHover` | transparent | transparent | Transparent hover |
| `colorTransparentBackgroundPressed` | transparent | transparent | Transparent pressed |
| `colorTransparentBackgroundSelected` | transparent | transparent | Transparent selected |

### Neutral Foreground Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `colorNeutralForeground1` | `#242424` | `#FFFFFF` | Primary text (highest contrast) |
| `colorNeutralForeground1Hover` | `#242424` | `#FFFFFF` | Primary text hover |
| `colorNeutralForeground1Pressed` | `#242424` | `#FFFFFF` | Primary text pressed |
| `colorNeutralForeground1Selected` | `#242424` | `#FFFFFF` | Primary text selected |
| `colorNeutralForeground2` | `#424242` | `#D6D6D6` | Secondary text |
| `colorNeutralForeground2Hover` | `#242424` | `#FFFFFF` | Secondary text hover |
| `colorNeutralForeground2Pressed` | `#242424` | `#FFFFFF` | Secondary text pressed |
| `colorNeutralForeground2Selected` | `#242424` | `#FFFFFF` | Secondary text selected |
| `colorNeutralForeground2BrandHover` | brand[80] | brand[100] | Brand-tinted hover |
| `colorNeutralForeground2BrandPressed` | brand[70] | brand[110] | Brand-tinted pressed |
| `colorNeutralForeground2BrandSelected` | brand[80] | brand[100] | Brand-tinted selected |
| `colorNeutralForeground3` | `#616161` | `#ADADAD` | Tertiary text |
| `colorNeutralForeground3Hover` | `#424242` | `#D6D6D6` | Tertiary hover |
| `colorNeutralForeground3Pressed` | `#424242` | `#D6D6D6` | Tertiary pressed |
| `colorNeutralForeground3Selected` | `#424242` | `#D6D6D6` | Tertiary selected |
| `colorNeutralForeground3BrandHover` | brand[80] | brand[100] | Tertiary brand hover |
| `colorNeutralForeground3BrandPressed` | brand[70] | brand[110] | Tertiary brand pressed |
| `colorNeutralForeground3BrandSelected` | brand[80] | brand[100] | Tertiary brand selected |
| `colorNeutralForeground4` | `#707070` | `#999999` | Quaternary text (low emphasis) |
| `colorNeutralForegroundDisabled` | `#BDBDBD` | `#5C5C5C` | Disabled text |
| `colorNeutralForegroundInverted` | `#FFFFFF` | `#242424` | Inverted foreground |
| `colorNeutralForegroundInvertedLink` | `#FFFFFF` | `#242424` | Inverted link |
| `colorNeutralForegroundOnBrand` | `#FFFFFF` | `#FFFFFF` | Text on brand background |
| `colorNeutralForegroundStaticInverted` | `#FFFFFF` | `#FFFFFF` | Always white text |

### Neutral Stroke Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `colorNeutralStroke1` | `#D1D1D1` | `#525252` | Primary border |
| `colorNeutralStroke1Hover` | `#C7C7C7` | `#5C5C5C` | Primary border hover |
| `colorNeutralStroke1Pressed` | `#B3B3B3` | `#474747` | Primary border pressed |
| `colorNeutralStroke1Selected` | `#BDBDBD` | `#575757` | Primary border selected |
| `colorNeutralStroke2` | `#E0E0E0` | `#383838` | Secondary border (subtle) |
| `colorNeutralStroke3` | `#F0F0F0` | `#2E2E2E` | Tertiary border (very subtle) |
| `colorNeutralStrokeAccessible` | `#616161` | `#ADADAD` | AA-contrast border |
| `colorNeutralStrokeAccessibleHover` | `#575757` | `#BDBDBD` | AA-contrast hover |
| `colorNeutralStrokeAccessiblePressed` | `#4D4D4D` | `#C7C7C7` | AA-contrast pressed |
| `colorNeutralStrokeAccessibleSelected` | brand[80] | brand[100] | AA-contrast selected (brand) |
| `colorNeutralStrokeDisabled` | `#E0E0E0` | `#383838` | Disabled border |
| `colorNeutralStrokeOnBrand` | `#FFFFFF` | `#292929` | Border on brand bg |
| `colorNeutralStrokeOnBrand2` | `#FFFFFF` | `#FFFFFF` | White border on brand |
| `colorNeutralStrokeOnBrand2Hover` | `#FFFFFF` | `#FFFFFF` | White border hover |
| `colorNeutralStrokeOnBrand2Pressed` | `#FFFFFF` | `#FFFFFF` | White border pressed |
| `colorNeutralStrokeOnBrand2Selected` | `#FFFFFF` | `#FFFFFF` | White border selected |

### Brand Tokens (Theme-Dependent)

| Token | Light (Teams Blue) | Dark (Teams Blue) | Usage |
|---|---|---|---|
| `colorBrandBackground` | brand[80] `#5B5FC7` | brand[70] `#4F52B2` | Primary brand bg |
| `colorBrandBackgroundHover` | brand[70] `#4F52B2` | brand[80] `#5B5FC7` | Brand bg hover |
| `colorBrandBackgroundPressed` | brand[40] `#2F2F6B` | brand[40] `#2F2F6B` | Brand bg pressed |
| `colorBrandBackgroundSelected` | brand[60] `#444791` | brand[60] `#444791` | Brand bg selected |
| `colorBrandBackground2` | brand[160] `#EBF0FF` | brand[20] `#1A1C40` | Subtle brand bg |
| `colorBrandBackground2Hover` | brand[150] `#CFD9F9` | brand[40] `#2F2F6B` | Subtle brand hover |
| `colorBrandBackground2Pressed` | brand[130] `#9EAEF1` | brand[10] `#0D0E24` | Subtle brand pressed |
| `colorBrandBackgroundInverted` | `#FFFFFF` | `#FFFFFF` | Inverted brand bg |
| `colorBrandBackgroundInvertedHover` | brand[160] | brand[160] | Inverted brand hover |
| `colorBrandBackgroundInvertedPressed` | brand[140] | brand[140] | Inverted brand pressed |
| `colorBrandBackgroundInvertedSelected` | brand[150] | brand[150] | Inverted brand selected |
| `colorBrandBackgroundStatic` | brand[80] | brand[80] | Static brand (no theme) |
| `colorBrandForeground1` | brand[80] | brand[100] | Primary brand text |
| `colorBrandForeground2` | brand[70] | brand[110] | Secondary brand text |
| `colorBrandForegroundLink` | brand[70] | brand[100] | Brand links |
| `colorBrandForegroundLinkHover` | brand[60] | brand[110] | Brand link hover |
| `colorBrandForegroundLinkPressed` | brand[40] | brand[90] | Brand link pressed |
| `colorBrandForegroundLinkSelected` | brand[70] | brand[100] | Brand link selected |
| `colorBrandForegroundInverted` | brand[80] | brand[80] | Inverted brand text |
| `colorBrandForegroundInvertedHover` | brand[70] | brand[70] | Inverted brand hover |
| `colorBrandForegroundOnLight` | brand[80] | brand[80] | Brand on light bg |
| `colorBrandForegroundOnLightHover` | brand[70] | brand[70] | Brand on light hover |
| `colorBrandStroke1` | brand[80] | brand[100] | Primary brand border |
| `colorBrandStroke2` | brand[140] | brand[50] | Subtle brand border |
| `colorBrandStroke2Hover` | brand[120] | brand[50] | Subtle brand hover |
| `colorBrandStroke2Pressed` | brand[80] | brand[30] | Subtle brand pressed |
| `colorBrandStroke2Contrast` | brand[140] | brand[30] | Brand border contrast |

### Status Color Tokens

| Token | Usage |
|---|---|
| `colorStatusSuccessBackground1` | Success background (subtle) |
| `colorStatusSuccessBackground2` | Success background (moderate) |
| `colorStatusSuccessBackground3` | Success background (strong) |
| `colorStatusSuccessForeground1` | Success text |
| `colorStatusSuccessForeground2` | Success icon |
| `colorStatusSuccessForeground3` | Success on strong bg |
| `colorStatusSuccessForegroundInverted` | Inverted success |
| `colorStatusSuccessBorderActive` | Active success border |
| `colorStatusSuccessBorder1` | Success border |
| `colorStatusSuccessBorder2` | Subtle success border |
| `colorStatusWarningBackground1` | Warning background (subtle) |
| `colorStatusWarningBackground2` | Warning background (moderate) |
| `colorStatusWarningBackground3` | Warning background (strong, uses yellow) |
| `colorStatusWarningForeground1` | Warning text |
| `colorStatusWarningForeground2` | Warning icon |
| `colorStatusWarningForeground3` | Warning on strong bg |
| `colorStatusWarningBorderActive` | Active warning border |
| `colorStatusWarningBorder1` | Warning border |
| `colorStatusWarningBorder2` | Subtle warning border |
| `colorStatusDangerBackground1` | Error background (subtle) |
| `colorStatusDangerBackground2` | Error background (moderate) |
| `colorStatusDangerBackground3` | Error background (strong, red) |
| `colorStatusDangerForeground1` | Error text |
| `colorStatusDangerForeground2` | Error icon |
| `colorStatusDangerForeground3` | Error on strong bg |
| `colorStatusDangerBorderActive` | Active error border |
| `colorStatusDangerBorder1` | Error border |
| `colorStatusDangerBorder2` | Subtle error border |

### Palette Color Tokens

Available palettes: Red, Green, Yellow, Blue, Berry, Marigold, Peach, Plum, Beige, Mink, Platinum, Anchor, Navy, DarkOrange, Cranberry, Pumpkin, Forest, Seafoam, DarkGreen, LightTeal, Teal, Steel, Lavender, Purple, Lilac, RoyalBlue, Cornflower, MarigoldYellow

Each palette provides:
- `colorPalette{Name}Background1` through `Background3`
- `colorPalette{Name}Foreground1` through `Foreground3`
- `colorPalette{Name}Border1`, `Border2`, `BorderActive`

---

## Spacing Tokens — Full Reference

### Component-Level Spacing

| Token | Value | Horizontal | Vertical |
|---|---|---|---|
| None | 0 | `spacingHorizontalNone` | `spacingVerticalNone` |
| XXS | 2px | `spacingHorizontalXXS` | `spacingVerticalXXS` |
| XS | 4px | `spacingHorizontalXS` | `spacingVerticalXS` |
| SNudge | 6px | `spacingHorizontalSNudge` | `spacingVerticalSNudge` |
| S | 8px | `spacingHorizontalS` | `spacingVerticalS` |
| MNudge | 10px | `spacingHorizontalMNudge` | `spacingVerticalMNudge` |
| M | 12px | `spacingHorizontalM` | `spacingVerticalM` |
| L | 16px | `spacingHorizontalL` | `spacingVerticalL` |
| XL | 20px | `spacingHorizontalXL` | `spacingVerticalXL` |
| XXL | 24px | `spacingHorizontalXXL` | `spacingVerticalXXL` |
| XXXL | 32px | `spacingHorizontalXXXL` | `spacingVerticalXXXL` |

### Stroke Width Tokens

| Token | Value |
|---|---|
| `strokeWidthThin` | 1px |
| `strokeWidthThick` | 2px |
| `strokeWidthThicker` | 3px |
| `strokeWidthThickest` | 4px |

---

## Typography Tokens — Full Reference

### Font Family

| Token | Value |
|---|---|
| `fontFamilyBase` | `'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` |
| `fontFamilyMonospace` | `'Cascadia Code', 'Cascadia Mono', Consolas, 'Courier New', monospace` |
| `fontFamilyNumeric` | `Bahnschrift, 'Segoe UI Variable', 'Segoe UI', sans-serif` |

### Font Size Scale

| Token | Value | Typical Use |
|---|---|---|
| `fontSizeBase100` | 10px | Fine print, badges |
| `fontSizeBase200` | 12px | Captions, labels, metadata |
| `fontSizeBase300` | 14px | **Body text (default)** |
| `fontSizeBase400` | 16px | Large body, subtitle2 |
| `fontSizeBase500` | 20px | Subtitle1, section headers |
| `fontSizeBase600` | 24px | Title2, card headers |
| `fontSizeHero700` | 28px | Title1, page headers |
| `fontSizeHero800` | 32px | Hero headings |
| `fontSizeHero900` | 40px | Large title |
| `fontSizeHero1000` | 68px | Display text |

### Line Height Scale

| Token | Value |
|---|---|
| `lineHeightBase100` | 14px |
| `lineHeightBase200` | 16px |
| `lineHeightBase300` | 20px |
| `lineHeightBase400` | 22px |
| `lineHeightBase500` | 28px |
| `lineHeightBase600` | 32px |
| `lineHeightHero700` | 36px |
| `lineHeightHero800` | 40px |
| `lineHeightHero900` | 52px |
| `lineHeightHero1000` | 92px |

### Font Weight Scale

| Token | Value | CSS Keyword |
|---|---|---|
| `fontWeightRegular` | 400 | normal |
| `fontWeightMedium` | 500 | medium |
| `fontWeightSemibold` | 600 | semibold |
| `fontWeightBold` | 700 | bold |

---

## Shadow Tokens — Full Reference

### Neutral Shadows

| Token | Value (Light) | Usage |
|---|---|---|
| `shadow2` | `0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)` | Cards at rest |
| `shadow4` | `0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)` | Dropdowns |
| `shadow8` | `0 0 2px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.14)` | Popovers, menus |
| `shadow16` | `0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)` | Dialogs |
| `shadow28` | `0 0 8px rgba(0,0,0,0.13), 0 14px 28px rgba(0,0,0,0.15)` | Teaching callouts |
| `shadow64` | `0 0 8px rgba(0,0,0,0.13), 0 32px 64px rgba(0,0,0,0.24)` | Maximum elevation |

### Brand Shadows

Brand shadows use the brand color instead of black:
- `shadow2Brand`, `shadow4Brand`, `shadow8Brand`, `shadow16Brand`, `shadow28Brand`, `shadow64Brand`

### Shadow Color Tokens

| Token | Light | Dark |
|---|---|---|
| `colorNeutralShadowAmbient` | `rgba(0,0,0,0.12)` | `rgba(0,0,0,0.24)` |
| `colorNeutralShadowKey` | `rgba(0,0,0,0.14)` | `rgba(0,0,0,0.28)` |
| `colorNeutralShadowAmbientLighter` | `rgba(0,0,0,0.06)` | `rgba(0,0,0,0.12)` |
| `colorNeutralShadowKeyLighter` | `rgba(0,0,0,0.07)` | `rgba(0,0,0,0.14)` |
| `colorNeutralShadowAmbientDarker` | `rgba(0,0,0,0.20)` | `rgba(0,0,0,0.40)` |
| `colorNeutralShadowKeyDarker` | `rgba(0,0,0,0.24)` | `rgba(0,0,0,0.48)` |
| `colorBrandShadowAmbient` | `rgba(0,0,0,0.30)` | `rgba(0,0,0,0.30)` |
| `colorBrandShadowKey` | `rgba(0,0,0,0.25)` | `rgba(0,0,0,0.25)` |

Brand shadows on colored surfaces use a luminosity equation:
- Luminosity = 0.2126 × R + 0.7152 × G + 0.0722 × B
- Shadow 1 opacity = Round(42 - 0.116 × luminosity)
- Shadow 2 opacity = Round(34 - 0.09 × luminosity)

### Stencil / Skeleton Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `colorNeutralStencil1` | grey[90] | grey[34] | Primary skeleton placeholder |
| `colorNeutralStencil2` | grey[98] | grey[20] | Secondary skeleton placeholder |
| `colorNeutralStencil1Alpha` | blackAlpha[10] | whiteAlpha[10] | Semi-transparent skeleton |
| `colorNeutralStencil2Alpha` | blackAlpha[5] | whiteAlpha[5] | Subtle skeleton |

### Interaction State Pattern

Components get **darker** on interaction in light theme:
- rest (lightest) → hover → pressed/selected (darkest)
- Focus does not change color — adds a thicker stroke instead
- Windows reverses this: controls get **lighter** on interaction

---

## Motion Tokens — Full Reference

### Duration Scale

| Token | Value | Usage |
|---|---|---|
| `durationUltraFast` | 50ms | Micro-interactions, checkmarks |
| `durationFaster` | 100ms | Button state changes, toggles |
| `durationFast` | 150ms | Hover effects, focus rings |
| `durationNormal` | 200ms | **Default transition duration** |
| `durationGentle` | 250ms | Panel reveals, card expansions |
| `durationSlow` | 300ms | Page transitions, dialogs |
| `durationSlower` | 400ms | Complex animations |
| `durationUltraSlow` | 500ms | Full-page transitions |

### Easing Curves

| Token | Value | When to Use |
|---|---|---|
| `curveAccelerateMax` | `cubic-bezier(1, 0, 1, 1)` | Elements leaving the screen quickly |
| `curveAccelerateMid` | `cubic-bezier(0.7, 0, 1, 0.5)` | Standard exit animation |
| `curveAccelerateMin` | `cubic-bezier(0.8, 0, 1, 1)` | Subtle exit, element fading |
| `curveDecelerateMax` | `cubic-bezier(0, 0, 0, 1)` | Elements entering with emphasis |
| `curveDecelerateMid` | `cubic-bezier(0.1, 0.9, 0.2, 1)` | **Standard enter animation** |
| `curveDecelerateMin` | `cubic-bezier(0.33, 0, 0.1, 1)` | Subtle enter, element appearing |
| `curveEasyEaseMax` | `cubic-bezier(0.8, 0, 0.2, 1)` | Dramatic state change |
| `curveEasyEase` | `cubic-bezier(0.33, 0, 0.67, 1)` | **General-purpose transition** |
| `curveLinear` | `cubic-bezier(0, 0, 1, 1)` | Progress bars, constant motion |

### Motion Principles

1. **Purposeful** — Animation clarifies hierarchy, directs attention, provides feedback
2. **Responsive** — Transitions feel immediate (< 200ms for micro-interactions)
3. **Natural** — Easing curves mimic physical motion (decelerate on enter, accelerate on exit)
4. **Consistent** — Same duration/easing for same interaction type across the system
5. **Accessible** — Respect `prefers-reduced-motion: reduce` — disable or minimize all animations

```tsx
const useStyles = makeStyles({
  root: {
    '@media (prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms',
      transitionDuration: '0.01ms',
    },
  },
});
```

---

## External Resources

- **Design tokens overview**: https://fluent2.microsoft.design/design-tokens
- **Color tokens**: https://fluent2.microsoft.design/design-tokens/color-tokens
- **Elevation tokens**: https://fluent2.microsoft.design/design-tokens/elevation
- **Motion tokens**: https://fluent2.microsoft.design/design-tokens/motion
- **Token pipeline (GitHub)**: https://github.com/microsoft/fluentui-token-pipeline
- **Fluent 2 Figma variables**: Tokens implemented as Figma Variables for light/dark mode toggling
- **Storybook tokens docs**: https://react.fluentui.dev/?path=/docs/concepts-developer-design-tokens--docs
