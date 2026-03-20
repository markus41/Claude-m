---
name: Fluent UI Cross-Platform
description: >
  Fluent UI for iOS (Swift/UIKit) and Android (Kotlin) — platform setup, component catalogs,
  design token parity, CocoaPods/SPM for iOS, Gradle for Android, and Figma design kits for
  each platform.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fluent ios
  - fluent android
  - fluent swift
  - fluent kotlin
  - fluent mobile
  - cross-platform fluent
  - fluent native
  - fluent apple
  - fluent ui apple
  - fluent ui android
---

# Fluent UI Cross-Platform

## 1. Overview

Microsoft Fluent 2 is a cross-platform design system that delivers consistent, accessible, and
themeable UI across **Web** (React), **iOS** (Swift/UIKit/SwiftUI), and **Android** (Kotlin/Jetpack Compose).
Each platform has its own native implementation that respects platform idioms while maintaining
visual and behavioral parity through a shared design token architecture.

The three platform libraries are:

| Platform | Repository | Package |
|----------|-----------|---------|
| Web | [fluentui](https://github.com/microsoft/fluentui) | `@fluentui/react-components` (npm) |
| iOS | [fluentui-apple](https://github.com/microsoft/fluentui-apple) | `MicrosoftFluentUI` (CocoaPods / SPM) |
| Android | [fluentui-android](https://github.com/microsoft/fluentui-android) | `com.microsoft.fluentui` (Maven / Gradle) |

All three libraries target Fluent 2 design language and share the same design token foundations,
ensuring that a "Brand Button" on Web looks and feels like its counterpart on iOS and Android,
while still respecting each platform's native interaction patterns (e.g., iOS swipe gestures,
Android Material ripple effects).

### When to use this skill

- Setting up Fluent UI in a native iOS or Android project
- Ensuring design token parity across Web, iOS, and Android
- Building cross-platform apps (e.g., Teams, Outlook) that need consistent Fluent styling
- Mapping Web component APIs to their iOS/Android equivalents
- Integrating Figma design kits for mobile platforms

---

## 2. Platform Comparison Table

### Component Parity Matrix

| Component | Web (React) | iOS (Swift) | Android (Kotlin) | Notes |
|-----------|:-----------:|:-----------:|:-----------------:|-------|
| Avatar | Yes | Yes | Yes | Full parity including groups |
| AvatarGroup | Yes | Yes | Yes | |
| Badge | Yes | Yes | Yes | Including BadgeField on iOS |
| Button | Yes | Yes | Yes | All variants: primary, outline, subtle, transparent |
| Card | Yes | Yes | Yes | |
| Checkbox | Yes | Yes | Yes | |
| DatePicker | Yes | Yes | Yes | Platform-native pickers used |
| Dialog | Yes | Yes | Yes | iOS uses UIAlertController patterns |
| Divider | Yes | Yes | Yes | |
| Drawer | Yes | Yes | Yes | iOS: side panel; Android: bottom sheet or side |
| HUD | No | Yes | No | iOS-only heads-up display |
| Label | Yes | Yes | Yes | |
| Link | Yes | Yes | Yes | |
| List / ListItem | Yes | Yes | Yes | |
| Menu | Yes | Yes | Yes | Platform-native menus |
| NavigationBar | Partial | Yes | Yes | Mobile-specific |
| PeoplePicker | Yes | Yes | Yes | |
| Persona | Yes | Yes | Yes | Combined avatar + text |
| PillButton | Yes | Yes | Yes | |
| PopupMenu | Partial | Yes | Yes | Mobile-specific |
| ProgressIndicator | Yes | Yes | Yes | |
| SearchBar | Partial | Yes | Yes | Mobile-optimized |
| SegmentedControl | Partial | Yes | Yes | iOS: UISegmentedControl style |
| Shimmer | Yes | Yes | Yes | Loading placeholder |
| Slider | Yes | Yes | Yes | |
| Snackbar | Partial | No | Yes | Android-native pattern |
| Switch / Toggle | Yes | Yes | Yes | |
| TabBar | Partial | Yes | Yes | Bottom navigation |
| Text | Yes | Yes | Yes | |
| TextField | Yes | Yes | Yes | |
| Tooltip | Yes | Yes | Yes | |
| Typography | Yes | Yes | Yes | Shared type ramp |

### Token Parity

| Token Category | Web | iOS | Android |
|---------------|:---:|:---:|:-------:|
| Color (brand) | Yes | Yes | Yes |
| Color (neutral) | Yes | Yes | Yes |
| Color (status) | Yes | Yes | Yes |
| Typography (size) | Yes | Yes | Yes |
| Typography (weight) | Yes | Yes | Yes |
| Spacing | Yes | Yes | Yes |
| Border radius | Yes | Yes | Yes |
| Shadow / Elevation | Yes | Yes | Yes |
| Stroke width | Yes | Yes | Yes |
| Duration (motion) | Yes | Yes | Yes |
| Easing (motion) | Yes | Partial | Partial |

### Theming Parity

| Feature | Web | iOS | Android |
|---------|:---:|:---:|:-------:|
| Brand color override | Yes | Yes | Yes |
| Dark mode | Yes | Yes | Yes |
| High contrast | Yes | Yes | Yes |
| Per-component override | Yes | Yes | Yes |
| Dynamic type / font scaling | N/A | Yes | Yes |
| RTL support | Yes | Yes | Yes |

---

## 3. Design Token Parity

Fluent 2 defines a shared token taxonomy that maps to platform-native representations:

### Token Mapping Across Platforms

```
Fluent Token Name         Web (CSS Custom Property)           iOS (Swift)                          Android (Kotlin/XML)
---------------------     ----------------------------        ---------------------------------    ------------------------------------
colorBrandBackground      --colorBrandBackground              FluentTheme.color.brand.background   fluentui_color_brand_background
colorNeutralForeground1   --colorNeutralForeground1           FluentTheme.color.foreground1        fluentui_color_neutral_foreground1
fontSizeBase300           --fontSizeBase300                   FluentTheme.typography.body1.size     fluentui_font_size_300
spacingHorizontalM        --spacingHorizontalM                FluentTheme.spacing.medium           fluentui_spacing_horizontal_m
borderRadiusMedium        --borderRadiusMedium                FluentTheme.corner.radius8           fluentui_border_radius_medium
shadow4                   --shadow4                           FluentTheme.shadow.shadow4           fluentui_elevation_4
strokeWidthThin           --strokeWidthThin                   FluentTheme.stroke.widthThin         fluentui_stroke_width_thin
durationNormal            --durationNormal                    FluentTheme.animation.durationNormal fluentui_duration_normal
```

### Brand Color Pipeline

All platforms consume the same brand color ramp (shades 10-160):

```
Brand Ramp (shared)
  brandColor10  → lightest tint
  brandColor20
  ...
  brandColor80  → primary (default)
  ...
  brandColor160 → darkest shade

Web:   CSS custom properties generated by token pipeline
iOS:   ColorProviding protocol returns UIColor/Color per shade
Android: Theme attributes resolve to @color resources
```

### How Token Updates Propagate

1. Designers update tokens in Figma using the Fluent 2 token plugin
2. Token pipeline exports platform-specific formats:
   - Web: JSON to CSS custom properties
   - iOS: JSON to Swift constants / asset catalogs
   - Android: JSON to XML color/dimen resources
3. Each platform library consumes its native format at build time
4. Runtime theming APIs allow further overrides

---

## 4. iOS (fluentui-apple)

### Repository and Resources

- **GitHub**: [microsoft/fluentui-apple](https://github.com/microsoft/fluentui-apple)
- **CocoaPods**: [MicrosoftFluentUI](https://cocoapods.org/pods/MicrosoftFluentUI)
- **Component Gallery**: [fluent2.microsoft.design/components/ios](https://fluent2.microsoft.design/components/ios/)
- **Figma Kit**: [Fluent 2 iOS UI Kit](https://www.figma.com/community/file/836833645402438850)
- **Language**: Swift 5.9+
- **Minimum Target**: iOS 16.0+
- **UI Frameworks**: UIKit and SwiftUI

### Installation

#### CocoaPods

```ruby
# Podfile
platform :ios, '16.0'
use_frameworks!

target 'MyApp' do
  pod 'MicrosoftFluentUI', '~> 0.20'
end
```

#### Swift Package Manager

```
https://github.com/microsoft/fluentui-apple.git
```

In Xcode: File > Add Package Dependencies > paste the URL > select version range.

### Available Components

The iOS library ships these major components (organized by category):

**Core Controls**: Button, Link, Label, Text, ActivityIndicator, ProgressIndicator
**Data Input**: TextField, SearchBar, DateTimePicker, PeoplePicker, PillButtonBar
**Selection**: Checkbox, RadioButton, Switch (Toggle), SegmentedControl, Slider
**Layout**: Card, Divider, DrawerController, SheetController, SideTabBar, TabBarView
**Status & Info**: Avatar, AvatarGroup, Badge, BadgeField, HUD, IndeterminateProgressBar, Notification (Toast/Bar), Shimmer, Tooltip
**Navigation**: NavigationBar, CommandBar, BottomCommandBar, PopupMenuController
**Lists**: ListItem, PersonaListItem, TableViewCell (FluentUI styled)

### Theming

```swift
import FluentUI

// Apply a custom brand theme globally
let customTheme = FluentTheme()
customTheme.register(tokenSetType: ButtonTokenSet.self) { token, theme in
    switch token {
    case .backgroundColor:
        return .uiColor { theme.color(.brandBackground1) }
    default:
        return nil
    }
}

// Apply to a view hierarchy
view.fluentTheme = customTheme
```

The `FluentTheme` object holds all token values. Implement `ColorProviding` to supply custom
brand colors, or use `FluentTheme.register(tokenSetType:provider:)` for per-component overrides.

### Dark Mode

Fluent UI Apple automatically responds to `UIUserInterfaceStyle` changes. All semantic colors
resolve through the token system, so dark mode works without extra code. To force a specific
appearance:

```swift
view.overrideUserInterfaceStyle = .dark
```

### Accessibility

- Dynamic Type supported on all text-bearing components
- VoiceOver labels and hints set by default
- Minimum 44pt touch targets enforced
- Reduced Motion respected for animations

> For the complete iOS reference with full code examples, see
> `references/ios-reference.md`.

---

## 5. Android (fluentui-android)

### Repository and Resources

- **GitHub**: [microsoft/fluentui-android](https://github.com/microsoft/fluentui-android)
- **Maven**: `com.microsoft.fluentui` group
- **Component Gallery**: [fluent2.microsoft.design/components/android](https://fluent2.microsoft.design/components/android/)
- **Figma Kit**: [Fluent 2 Android UI Kit](https://www.figma.com/community/file/836835062056249539)
- **Language**: Kotlin 1.9+
- **Minimum SDK**: API 21 (Android 5.0)
- **UI Frameworks**: Android Views (XML) and Jetpack Compose

### Installation (Gradle)

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        maven { url = uri("https://pkgs.dev.azure.com/nicemi365/nicemi365/_packaging/nicemi365-maven/maven/v1") }
        mavenCentral()
        google()
    }
}

// app/build.gradle.kts
dependencies {
    implementation("com.microsoft.fluentui:FluentUI:0.2.+")
    // Or individual modules:
    implementation("com.microsoft.fluentui:fluentui_core:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_controls:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_drawer:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_listitem:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_persona:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_popupmenu:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_topappbars:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_transients:0.2.+")
}
```

### Available Components

**Core Controls**: Button, FAB (Floating Action Button), Link, Label, Text, ProgressIndicator
**Data Input**: TextField, SearchBar, DateTimePicker, PeoplePicker, PillBar
**Selection**: Checkbox, RadioButton, Switch (Toggle), SegmentedControl (TabLayout)
**Layout**: Card, Divider, Drawer (BottomSheet, Side), ListItem, BasicListItem, PersonaListItem
**Status & Info**: Avatar, AvatarGroup, Badge, Shimmer, Snackbar, Tooltip, ProgressBar
**Navigation**: AppBarLayout (TopAppBar), BottomNavigation, PopupMenu, ContextMenu, BottomSheet
**Compose**: BasicCard, Button, Avatar, Badge, CircularProgressIndicator, LinearProgressIndicator, SearchBar, Shimmer, TextField, ToggleSwitch

### Theming

```kotlin
import com.microsoft.fluentui.theme.FluentTheme
import com.microsoft.fluentui.theme.token.AliasTokens

// In your Application class or Activity
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Override brand colors
        FluentTheme.updateAliasTokens(
            AliasTokens().apply {
                brandColor = listOf(
                    Color(0xFF0F6CBD),  // shade10
                    // ... full ramp
                )
            }
        )
    }
}

// Jetpack Compose
@Composable
fun MyScreen() {
    FluentTheme {
        // Fluent-styled content
        Button(onClick = { }) {
            Text("Fluent Button")
        }
    }
}
```

### Dark Mode

The library respects `AppCompatDelegate.setDefaultNightMode()` and the system dark mode setting.
All Fluent tokens resolve to dark-mode variants automatically via Android resource qualifiers
(`values-night/`).

### Material You Integration

Fluent UI Android can coexist with Material 3 / Material You. The recommended approach:

1. Use Fluent tokens as the primary design language
2. Let Material You dynamic color inform the brand ramp at runtime
3. Fluent components render with Fluent styling; Material components use Material theming

```kotlin
// Extract Material You dynamic color and feed into Fluent brand ramp
val dynamicColor = dynamicDarkColorScheme(context).primary
FluentTheme.updateAliasTokens(
    AliasTokens().apply {
        brandColor = generateBrandRamp(dynamicColor)
    }
)
```

> For the complete Android reference with full code examples, see
> `references/android-reference.md`.

---

## 6. Cross-Platform Patterns

### Pattern 1: Shared Token Source of Truth

Maintain a single `tokens.json` that feeds all three platform builds:

```
tokens/
  global.json          # Global color palette, type ramp
  brand-contoso.json   # Brand-specific overrides
  alias.json           # Semantic aliases
scripts/
  build-web.js         # Outputs CSS custom properties
  build-ios.swift      # Outputs Swift constants
  build-android.kt     # Outputs XML resources
```

Use [Style Dictionary](https://amzn.github.io/style-dictionary/) or the Fluent token pipeline
to transform `tokens.json` into each platform's native format.

### Pattern 2: Component API Alignment

When building the same feature on all platforms, align prop/parameter names:

```
Fluent Concept    Web (React prop)    iOS (Swift param)       Android (Kotlin param)
--------------    ----------------    -----------------       ----------------------
appearance        appearance          style                   buttonStyle
size              size                size                    size
icon              icon                icon                    icon
disabled          disabled            isDisabled              isEnabled (inverted)
```

### Pattern 3: Platform-Specific Adaptations

Some patterns are intentionally different per platform to respect native conventions:

| Pattern | Web | iOS | Android |
|---------|-----|-----|---------|
| Navigation | React Router / tabs | UINavigationController / TabBarController | Navigation Component / BottomNavigation |
| Dialogs | `<Dialog>` overlay | UIAlertController / sheet | AlertDialog / BottomSheetDialog |
| Pull to refresh | Not standard | UIRefreshControl | SwipeRefreshLayout |
| Haptic feedback | N/A | UIImpactFeedbackGenerator | HapticFeedbackConstants |
| Status bar | N/A | UIStatusBarStyle | WindowInsetsController |

### Pattern 4: Shared Figma Libraries

Use all three Figma kits in a single Figma project to design cross-platform:

1. **Web Kit**: [Fluent 2 Web UI Kit](https://www.figma.com/community/file/836828295772957889)
2. **iOS Kit**: [Fluent 2 iOS UI Kit](https://www.figma.com/community/file/836833645402438850)
3. **Android Kit**: [Fluent 2 Android UI Kit](https://www.figma.com/community/file/836835062056249539)

Create a shared "Specs" page that maps each screen to all three platform variants side by side.

### Pattern 5: Accessibility Parity Checklist

Ensure accessibility consistency across platforms:

- [ ] All interactive elements have accessible names (aria-label / accessibilityLabel / contentDescription)
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 UI) on all platforms
- [ ] Focus order is logical (tab order / VoiceOver order / TalkBack order)
- [ ] Dynamic text sizing works (CSS rem / Dynamic Type / sp units)
- [ ] Motion can be reduced (prefers-reduced-motion / UIAccessibility.isReduceMotionEnabled / Settings.Global.ANIMATOR_DURATION_SCALE)
- [ ] Touch targets meet minimums (44px Web / 44pt iOS / 48dp Android)

---

## 7. Cross-References

- **Design Tokens (core)**: See the main `fluent-ui-design` SKILL.md for the complete token
  taxonomy, CSS custom property reference, and Griffel styling patterns.
- **Theming & Extensibility**: See `fluent-extensibility/SKILL.md` for advanced theming
  techniques including custom token sets, theme providers, and design-to-code workflows.
- **Component APIs (Web)**: See `fluent-components/SKILL.md` for the full React component
  catalog with prop tables and composition patterns.
- **Accessibility**: See `fluent-accessibility/SKILL.md` for WCAG compliance patterns that
  apply across all platforms.

### Reference Files

| File | Contents |
|------|----------|
| `references/ios-reference.md` | Complete iOS component catalog, setup guides, theming, and Swift code examples |
| `references/android-reference.md` | Complete Android component catalog, setup guides, theming, and Kotlin code examples |
