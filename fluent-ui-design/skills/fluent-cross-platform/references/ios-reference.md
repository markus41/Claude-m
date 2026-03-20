# Fluent UI Apple (iOS) Reference

## Overview

The `fluentui-apple` library provides native Swift implementations of Fluent 2 components for
iOS (and macOS). Components are available as both UIKit classes and SwiftUI views, with full
support for theming, dark mode, Dynamic Type, and VoiceOver accessibility.

- **Repository**: [microsoft/fluentui-apple](https://github.com/microsoft/fluentui-apple)
- **License**: MIT
- **Language**: Swift 5.9+
- **Minimum iOS**: 16.0+
- **CocoaPods**: [MicrosoftFluentUI](https://cocoapods.org/pods/MicrosoftFluentUI)
- **Figma Kit**: [Fluent 2 iOS UI Kit](https://www.figma.com/community/file/836833645402438850)
- **Component Gallery**: [fluent2.microsoft.design/components/ios](https://fluent2.microsoft.design/components/ios/)

---

## Setup Guide

### CocoaPods Installation

```ruby
# Podfile
platform :ios, '16.0'
use_frameworks!

target 'MyApp' do
  # Full library
  pod 'MicrosoftFluentUI', '~> 0.20'

  # Or individual subspecs for smaller binary size
  pod 'MicrosoftFluentUI/Avatar_ios', '~> 0.20'
  pod 'MicrosoftFluentUI/Button_ios', '~> 0.20'
  pod 'MicrosoftFluentUI/Card_ios', '~> 0.20'
  pod 'MicrosoftFluentUI/TextField_ios', '~> 0.20'
end
```

Then run:

```bash
pod install
open MyApp.xcworkspace
```

### Swift Package Manager Installation

1. In Xcode, go to **File > Add Package Dependencies**
2. Enter the repository URL: `https://github.com/microsoft/fluentui-apple.git`
3. Select a version range (e.g., "Up to Next Major Version" from `0.20.0`)
4. Choose the `FluentUI` library product
5. Add to your target

Alternatively, in `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/microsoft/fluentui-apple.git", from: "0.20.0")
],
targets: [
    .target(
        name: "MyApp",
        dependencies: [
            .product(name: "FluentUI", package: "fluentui-apple")
        ]
    )
]
```

### Project Configuration

After installation, import the module in your Swift files:

```swift
import FluentUI
```

For SwiftUI views, the same import works. Components are available as both UIKit classes
(prefixed with `MSF` or using the `FluentUI` namespace) and SwiftUI views.

---

## Complete iOS Component Catalog

### Avatar

Displays a person's photo, initials, or icon in a circular frame.

```swift
// SwiftUI
Avatar(style: .default, size: .size40)
    .primaryText("Jane Doe")
    .image(UIImage(named: "jane"))

// UIKit
let avatar = MSFAvatar(style: .default, size: .size40)
avatar.state.primaryText = "Jane Doe"
avatar.state.image = UIImage(named: "jane")
view.addSubview(avatar.view)
```

**Sizes**: `.size16`, `.size20`, `.size24`, `.size28`, `.size32`, `.size40`, `.size56`, `.size72`
**Styles**: `.default`, `.accent`, `.outlined`, `.outlinedPrimary`, `.overflow`

### AvatarGroup

Displays a collection of avatars with overflow handling.

```swift
// SwiftUI
AvatarGroup(style: .stack, size: .size32) {
    Avatar().primaryText("Alice")
    Avatar().primaryText("Bob")
    Avatar().primaryText("Carol")
}

// UIKit
let group = MSFAvatarGroup(style: .stack, size: .size32)
group.state.createAvatar { avatar in
    avatar.primaryText = "Alice"
}
group.state.createAvatar { avatar in
    avatar.primaryText = "Bob"
}
```

**Styles**: `.stack` (overlapping), `.pile` (side by side)

### Badge / BadgeField

```swift
// Badge
Badge(style: .default, size: .small)
    .text("New")

// BadgeField — token-style input (email addresses, tags)
let badgeField = BadgeField()
badgeField.addBadge(withDataSource: BadgeStringDataSource(text: "user@contoso.com"))
badgeField.badgeFieldDelegate = self
```

### Button

```swift
// SwiftUI
FluentButton(style: .accent) {
    print("Tapped")
} label: {
    Text("Primary Action")
}

// UIKit
let button = Button(style: .accent)
button.setTitle("Primary Action", for: .normal)
button.addTarget(self, action: #selector(didTap), for: .touchUpInside)
```

**Styles**: `.accent` (filled brand), `.outline`, `.subtle`, `.transparent`, `.danger`, `.dangerOutline`, `.dangerSubtle`
**Sizes**: `.large` (48pt), `.medium` (40pt), `.small` (32pt)

### Card

```swift
// SwiftUI
CardView {
    VStack(alignment: .leading) {
        Text("Card Title")
            .font(.fluent(.body1Strong))
        Text("Card description text goes here.")
            .font(.fluent(.body1))
    }
}

// UIKit
let card = CardView(style: .default)
card.contentView = myCustomContentView
card.delegate = self
```

**Styles**: `.default`, `.elevated`

### Checkbox

```swift
// SwiftUI — not a standalone component; use native Toggle with Fluent styling
// or compose with FluentUI tokens

// UIKit
let checkbox = MSFCheckbox()
checkbox.state.isChecked = true
checkbox.state.label = "Accept terms"
checkbox.state.onCheckedChanged = { isChecked in
    print("Checked: \(isChecked)")
}
```

### DateTimePicker

```swift
// UIKit
let picker = DateTimePicker()
picker.present(from: self,
               with: .date,
               startDate: Date(),
               endDate: nil,
               datePickerType: .components)
picker.delegate = self

// DateTimePickerDelegate
func dateTimePicker(_ dateTimePicker: DateTimePicker, didPickStartDate startDate: Date, endDate: Date) {
    print("Selected: \(startDate)")
}
```

**Modes**: `.date`, `.dateTime`, `.dateRange`, `.dateTimeRange`

### Dialog / Alert

```swift
// UIKit — wraps UIAlertController with Fluent styling
let dialog = MSFDrawerController(sourceView: sourceView, sourceRect: sourceView.bounds, presentationDirection: .down)
dialog.contentView = myDialogContent
present(dialog, animated: true)
```

### Divider

```swift
// SwiftUI
Divider()
    .fluentDivider(spacing: .medium)

// UIKit
let divider = Separator()
divider.separatorStyle = .default
stackView.addArrangedSubview(divider)
```

### Drawer / Sheet

```swift
// UIKit — Bottom sheet
let drawer = DrawerController(sourceView: view, sourceRect: view.bounds, presentationDirection: .up)
drawer.contentView = sheetContentView
drawer.preferredContentSize = CGSize(width: 0, height: 400)
present(drawer, animated: true)

// Side drawer
let sideDrawer = DrawerController(sourceView: view, sourceRect: view.bounds, presentationDirection: .fromLeading)
sideDrawer.contentView = menuView
present(sideDrawer, animated: true)
```

### HUD (Heads-Up Display)

iOS-only component for brief, non-blocking status messages.

```swift
// UIKit
let hud = HUD()
hud.show(in: view, with: HUDParams(caption: "Saved", image: .checkmark))
hud.hide(afterDelay: 1.5)
```

### Label / Text

```swift
// SwiftUI — use Fluent typography tokens
Text("Headline")
    .font(.fluent(.title1))
    .foregroundColor(.fluent(.foreground1))

Text("Body text")
    .font(.fluent(.body1))
    .foregroundColor(.fluent(.foreground2))

// UIKit
let label = Label(style: .body1, colorStyle: .primary)
label.text = "Hello, Fluent"
```

**Type Styles**: `.caption2`, `.caption1`, `.body2`, `.body1`, `.body1Strong`, `.title3`, `.title2`, `.title1`, `.largeTitle`, `.display`

### List / TableViewCell

```swift
// UIKit — Fluent-styled table cells
let cell = TableViewCell()
cell.setup(
    title: "List Item Title",
    subtitle: "Secondary text",
    footer: "Footer text",
    customView: avatarView,
    customAccessoryView: chevronView,
    accessoryType: .disclosureIndicator
)
```

### NavigationBar

```swift
// UIKit
let navBar = NavigationBar()
navBar.update(with: NavigationItem(title: "My Screen", style: .primary))
navBar.delegate = self

// Supports large title style
navItem.navigationBarStyle = .primary   // Fluent brand color
navItem.navigationBarStyle = .system    // System default
navItem.navigationBarStyle = .custom    // Custom colors
```

### Notification / Toast

```swift
// UIKit
let notification = MSFNotification()
notification.state.style = .primaryToast
notification.state.message = "File uploaded successfully"
notification.state.actionButtonTitle = "View"
notification.state.actionButtonAction = { /* handle tap */ }
notification.showNotification(in: view)
```

**Styles**: `.primaryToast`, `.neutralToast`, `.primaryBar`, `.primaryOutlineBar`, `.neutralBar`, `.dangerBar`, `.warningBar`

### PeoplePicker

```swift
// UIKit
let peoplePicker = PeoplePicker()
peoplePicker.label = "To:"
peoplePicker.availablePersonas = searchResults
peoplePicker.delegate = self

// PeoplePickerDelegate
func peoplePicker(_ peoplePicker: PeoplePicker, getSuggestedPersonasForText text: String,
                  completion: @escaping ([Persona]) -> Void) {
    let filtered = allPeople.filter { $0.name.contains(text) }
    completion(filtered)
}
```

### PillButton / PillButtonBar

```swift
// UIKit
let pillBar = PillButtonBar(pillButtonStyle: .primary)
let items = [
    PillButtonBarItem(title: "All"),
    PillButtonBarItem(title: "Unread"),
    PillButtonBarItem(title: "Flagged")
]
pillBar.items = items
pillBar.barDelegate = self
```

### ProgressIndicator

```swift
// UIKit — Determinate
let progress = MSFLinearProgressBar()
progress.progress = 0.65

// UIKit — Indeterminate
let indeterminate = MSFIndeterminateProgressBar()
indeterminate.state.isAnimating = true
```

### SearchBar

```swift
// UIKit
let searchBar = SearchBar()
searchBar.delegate = self
searchBar.placeholderText = "Search files..."
searchBar.style = .darkContent

// SearchBarDelegate
func searchBar(_ searchBar: SearchBar, didUpdateSearchText newSearchText: String?) {
    filterResults(with: newSearchText)
}
```

### SegmentedControl

```swift
// UIKit
let segmented = SegmentedControl(items: ["Day", "Week", "Month"], style: .primaryPill)
segmented.onSelectAction = { [weak self] item, index in
    self?.updateView(for: index)
}
```

**Styles**: `.primaryPill`, `.neutralPill`

### Shimmer

```swift
// SwiftUI
ShimmerView()
    .frame(height: 80)

// UIKit
let shimmer = ShimmerLinesView()
shimmer.shimmerStyle = .revealing
shimmer.lineCount = 3
```

### Switch / Toggle

```swift
// UIKit — FluentUI wraps UISwitch with Fluent token colors
let toggle = FluentUISwitch()
toggle.isOn = true
toggle.addTarget(self, action: #selector(toggleChanged), for: .valueChanged)
```

### TabBar

```swift
// UIKit
let tabBar = TabBarView()
tabBar.items = [
    TabBarItem(title: "Home", image: UIImage(systemName: "house")),
    TabBarItem(title: "Search", image: UIImage(systemName: "magnifyingglass")),
    TabBarItem(title: "Profile", image: UIImage(systemName: "person"))
]
tabBar.delegate = self
```

### TextField

```swift
// UIKit
let textField = FluentTextField()
textField.placeholder = "Enter your name"
textField.leadingAssistiveText = "Required"
textField.trailingAssistiveText = "0/100"
textField.state = .focused
textField.onEditingChanged = { text in
    print("Text: \(text)")
}
```

**States**: `.rest`, `.focused`, `.error`, `.disabled`

### Tooltip

```swift
// UIKit
Tooltip.shared.show(with: "Helpful tip about this control",
                    for: targetView,
                    preferredArrowDirection: .down)
```

---

## Theming and Customization

### FluentTheme Object

`FluentTheme` is the central theming class. Every UIView has a `.fluentTheme` property that
resolves tokens for that view and its descendants.

```swift
// Create a custom theme
let theme = FluentTheme()

// Override color tokens
theme.register(tokenSetType: ButtonTokenSet.self) { token, theme in
    switch token {
    case .backgroundColor:
        return .uiColor {
            UIColor(light: UIColor(hex: "#0078D4"),
                    dark: UIColor(hex: "#2B88D8"))
        }
    case .foregroundColor:
        return .uiColor { .white }
    case .cornerRadius:
        return .float { 12.0 }
    default:
        return nil  // Fall back to defaults
    }
}

// Apply to a view hierarchy
myContainerView.fluentTheme = theme
```

### ColorProviding Protocol

For brand-level color overrides, implement `ColorProviding`:

```swift
class ContosoColorProvider: NSObject, ColorProviding {
    var primaryColor: UIColor { UIColor(hex: "#0078D4") }
    var primaryTint10Color: UIColor { UIColor(hex: "#2B88D8") }
    var primaryTint20Color: UIColor { UIColor(hex: "#62A8E5") }
    var primaryTint30Color: UIColor { UIColor(hex: "#95C2EE") }
    var primaryTint40Color: UIColor { UIColor(hex: "#C8DFF7") }
    var primaryShade10Color: UIColor { UIColor(hex: "#006CBF") }
    var primaryShade20Color: UIColor { UIColor(hex: "#005BA1") }
    var primaryShade30Color: UIColor { UIColor(hex: "#004377") }
}

// Register globally
FluentUIFramework.shared.colorProvider = ContosoColorProvider()
```

### Per-Component Token Overrides

```swift
// Override just the Avatar tokens
theme.register(tokenSetType: AvatarTokenSet.self) { token, theme in
    switch token {
    case .borderRadius:
        return .float { 8.0 }  // Square avatars
    default:
        return nil
    }
}
```

---

## Dark Mode Support

### Automatic Support

All Fluent components automatically adapt to dark mode. The token system resolves colors through
`UIColor` dynamic providers:

```swift
// Fluent tokens are already dynamic colors
let foreground = UIColor(light: .black, dark: .white)  // Simplified example
```

No extra code is needed for dark mode. The `FluentTheme` resolves the correct token variant
based on the current `UIUserInterfaceStyle`.

### Testing Dark Mode

```swift
// Force dark mode for testing
overrideUserInterfaceStyle = .dark

// In SwiftUI previews
MyView()
    .preferredColorScheme(.dark)

// In unit tests
let traitCollection = UITraitCollection(userInterfaceStyle: .dark)
let resolvedColor = theme.color(.foreground1).resolvedColor(with: traitCollection)
```

### Custom Dark Mode Colors

When providing custom theme colors, always supply both light and dark variants:

```swift
theme.register(tokenSetType: CardTokenSet.self) { token, theme in
    switch token {
    case .backgroundColor:
        return .uiColor {
            UIColor { traitCollection in
                traitCollection.userInterfaceStyle == .dark
                    ? UIColor(hex: "#1A1A1A")
                    : UIColor(hex: "#FFFFFF")
            }
        }
    default:
        return nil
    }
}
```

---

## Accessibility on iOS

### Dynamic Type

All Fluent text components support Dynamic Type automatically. The Fluent type ramp maps to
`UIFont.TextStyle` categories:

| Fluent Style | UIFont TextStyle | Default Size |
|-------------|-----------------|-------------|
| `.caption2` | `.caption2` | 11pt |
| `.caption1` | `.caption1` | 12pt |
| `.body2` | `.footnote` | 13pt |
| `.body1` | `.body` | 15pt |
| `.body1Strong` | `.body` (semibold) | 15pt |
| `.title3` | `.title3` | 17pt |
| `.title2` | `.title2` | 22pt |
| `.title1` | `.title1` | 28pt |
| `.largeTitle` | `.largeTitle` | 34pt |

```swift
// Fonts automatically scale with Dynamic Type
let label = Label(style: .body1, colorStyle: .primary)
label.adjustsFontForContentSizeCategory = true  // Enabled by default
```

### VoiceOver

Components set appropriate accessibility traits and labels by default:

```swift
// Button — automatically announces "Primary Action, button"
let button = Button(style: .accent)
button.setTitle("Primary Action", for: .normal)

// Override accessibility label when needed
button.accessibilityLabel = "Submit form"
button.accessibilityHint = "Double tap to submit the current form"

// Avatar — announces person name
let avatar = MSFAvatar(style: .default, size: .size40)
avatar.state.primaryText = "Jane Doe"
// VoiceOver: "Jane Doe, image"
```

### Touch Target Sizes

All interactive Fluent components enforce a minimum 44x44pt touch target, per Apple HIG:

```swift
// Even small-sized buttons pad their hit area
let smallButton = Button(style: .accent)
smallButton.sizeCategory = .small  // Visual size 32pt, touch target 44pt
```

### Reduced Motion

```swift
// Check and respect reduced motion
if UIAccessibility.isReduceMotionEnabled {
    // Skip animations
} else {
    UIView.animate(withDuration: FluentTheme.shared.animation.durationNormal) {
        // Animate
    }
}
```

### High Contrast

Fluent tokens include high-contrast variants that activate when the user enables
"Increase Contrast" in iOS Settings:

```swift
// Automatic — Fluent tokens resolve higher-contrast colors
// when UIAccessibility.isDarkerSystemColorsEnabled is true
```

---

## SwiftUI Integration

Many components are available as native SwiftUI views:

```swift
import FluentUI
import SwiftUI

struct ContentView: View {
    @State private var isToggled = false
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Profile") {
                    HStack {
                        Avatar(style: .default, size: .size40)
                            .primaryText("Jane Doe")
                        VStack(alignment: .leading) {
                            Text("Jane Doe")
                                .font(.fluent(.body1Strong))
                            Text("jane@contoso.com")
                                .font(.fluent(.body2))
                                .foregroundColor(.fluent(.foreground2))
                        }
                    }
                }

                Section("Settings") {
                    Toggle("Notifications", isOn: $isToggled)
                        .tint(Color.fluent(.brandBackground1))

                    FluentButton(style: .accent) {
                        print("Save tapped")
                    } label: {
                        Text("Save Changes")
                    }
                }
            }
            .searchable(text: $searchText)
            .navigationTitle("Settings")
        }
    }
}
```

### FluentUI + SwiftUI View Modifiers

```swift
// Apply Fluent theme to a SwiftUI hierarchy
MyView()
    .fluentTheme(customTheme)

// Use Fluent colors
Rectangle()
    .fill(Color.fluent(.brandBackground1))

// Use Fluent typography
Text("Hello")
    .font(.fluent(.title1))
```

---

## Common Patterns

### Navigation Pattern

```swift
// Tab-based navigation with Fluent TabBar
class MainTabController: UITabBarController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let homeVC = HomeViewController()
        homeVC.tabBarItem = UITabBarItem(
            title: "Home",
            image: UIImage(systemName: "house"),
            selectedImage: UIImage(systemName: "house.fill")
        )

        let searchVC = SearchViewController()
        searchVC.tabBarItem = UITabBarItem(
            title: "Search",
            image: UIImage(systemName: "magnifyingglass"),
            selectedImage: nil
        )

        viewControllers = [
            UINavigationController(rootViewController: homeVC),
            UINavigationController(rootViewController: searchVC)
        ]
    }
}
```

### List with People Pattern

```swift
class PeopleListViewController: UITableViewController {
    var people: [PersonaData] = []

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "PersonaCell", for: indexPath) as! TableViewCell
        let person = people[indexPath.row]
        cell.setup(
            title: person.name,
            subtitle: person.email,
            customView: {
                let avatar = MSFAvatar(style: .default, size: .size40)
                avatar.state.primaryText = person.name
                avatar.state.image = person.image
                return avatar.view
            }(),
            accessoryType: .disclosureIndicator
        )
        return cell
    }
}
```

### Search with Filtering

```swift
class SearchViewController: UIViewController, SearchBarDelegate {
    let searchBar = SearchBar()
    var allItems: [Item] = []
    var filteredItems: [Item] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        searchBar.delegate = self
        searchBar.placeholderText = "Search items..."
        view.addSubview(searchBar)
    }

    func searchBar(_ searchBar: SearchBar, didUpdateSearchText newSearchText: String?) {
        guard let query = newSearchText, !query.isEmpty else {
            filteredItems = allItems
            return
        }
        filteredItems = allItems.filter { $0.title.localizedCaseInsensitiveContains(query) }
        tableView.reloadData()
    }

    func searchBarDidCancel(_ searchBar: SearchBar) {
        filteredItems = allItems
        tableView.reloadData()
    }
}
```
