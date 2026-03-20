# Fluent UI Android Reference

## Overview

The `fluentui-android` library provides native Kotlin implementations of Fluent 2 components
for Android. Components are available as both traditional Android Views (XML layouts) and
Jetpack Compose composables, with full support for theming, dark mode, Material You integration,
and TalkBack accessibility.

- **Repository**: [microsoft/fluentui-android](https://github.com/microsoft/fluentui-android)
- **License**: MIT
- **Language**: Kotlin 1.9+
- **Minimum SDK**: API 21 (Android 5.0 Lollipop)
- **Target SDK**: API 34 (Android 14)
- **Maven Group**: `com.microsoft.fluentui`
- **Figma Kit**: [Fluent 2 Android UI Kit](https://www.figma.com/community/file/836835062056249539)
- **Component Gallery**: [fluent2.microsoft.design/components/android](https://fluent2.microsoft.design/components/android/)

---

## Setup Guide

### Gradle Installation

Add the Microsoft Fluent UI Maven repository and dependencies:

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://pkgs.dev.azure.com/nicemi365/nicemi365/_packaging/nicemi365-maven/maven/v1")
        }
    }
}
```

```kotlin
// app/build.gradle.kts
android {
    compileSdk = 34
    defaultConfig {
        minSdk = 21
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    // Full library (all modules)
    implementation("com.microsoft.fluentui:FluentUI:0.2.+")

    // Or individual modules for smaller APK size:
    implementation("com.microsoft.fluentui:fluentui_core:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_controls:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_drawer:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_listitem:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_menus:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_notification:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_others:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_persona:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_popupmenu:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_progress:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_tablayout:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_topappbars:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_transients:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_calendar:0.2.+")
    implementation("com.microsoft.fluentui:fluentui_peoplepicker:0.2.+")
}
```

### Application Setup

Ensure your Application or Activity theme extends a Fluent-compatible base:

```kotlin
// res/values/themes.xml
<resources>
    <style name="AppTheme" parent="Theme.FluentUI">
        <!-- Brand color overrides -->
        <item name="fluentuiBrandColor">@color/brand_primary</item>
        <item name="fluentuiBrandColorDark">@color/brand_primary_dark</item>
    </style>
</resources>
```

```kotlin
// AndroidManifest.xml
<application
    android:theme="@style/AppTheme"
    ... >
```

For Compose, wrap your content in `FluentTheme`:

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FluentTheme {
                MyApp()
            }
        }
    }
}
```

---

## Complete Android Component Catalog

### Avatar

Displays a person's photo, initials, or icon.

```kotlin
// XML View
<com.microsoft.fluentui.persona.AvatarView
    android:id="@+id/avatar"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:avatarSize="large"
    app:name="Jane Doe" />
```

```kotlin
// Programmatic
val avatar = AvatarView(context)
avatar.name = "Jane Doe"
avatar.avatarSize = AvatarSize.LARGE
avatar.avatarImageBitmap = BitmapFactory.decodeResource(resources, R.drawable.jane)
```

```kotlin
// Jetpack Compose
Avatar(
    person = Person(
        firstName = "Jane",
        lastName = "Doe",
        image = painterResource(R.drawable.jane)
    ),
    size = AvatarSize.Size40,
    modifier = Modifier.padding(8.dp)
)
```

**Sizes**: `Size16`, `Size20`, `Size24`, `Size28`, `Size32`, `Size40`, `Size56`, `Size72`
**Styles**: `Default`, `Accent`, `Outlined`, `OutlinedPrimary`, `Overflow`

### AvatarGroup

```kotlin
// Jetpack Compose
AvatarGroup(
    group = AvatarGroupStyle.Stack,
    size = AvatarSize.Size32,
    people = listOf(
        Person("Alice", "Smith"),
        Person("Bob", "Jones"),
        Person("Carol", "Davis")
    ),
    maxVisibleCount = 3
)
```

### Badge

```kotlin
// Jetpack Compose
Badge(
    text = "New",
    badgeType = BadgeType.Character
)

// Notification dot badge on an icon
BadgedBox(badge = { Badge(text = "3") }) {
    Icon(painterResource(R.drawable.ic_mail), contentDescription = "Mail")
}
```

### Button

```kotlin
// Jetpack Compose
Button(
    style = ButtonStyle.AccentButton,
    size = ButtonSize.Medium,
    onClick = { /* handle click */ },
    text = "Primary Action"
)

Button(
    style = ButtonStyle.OutlineButton,
    size = ButtonSize.Medium,
    onClick = { /* handle click */ },
    text = "Secondary Action"
)

// FAB (Floating Action Button)
FAB(
    size = FABSize.Large,
    state = FABState.Expanded,
    onClick = { /* handle click */ },
    icon = painterResource(R.drawable.ic_add),
    text = "New Item"
)
```

**Styles**: `AccentButton`, `OutlineButton`, `SubtleButton`, `TransparentButton`, `AccentOutlineButton`
**Sizes**: `Large` (48dp), `Medium` (40dp), `Small` (32dp)

```kotlin
// XML View
<com.microsoft.fluentui.button.Button
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Primary Action"
    app:fluentui_buttonStyle="accent" />
```

### Card

```kotlin
// Jetpack Compose
BasicCard(
    modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp),
    onClick = { /* handle tap */ }
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = "Card Title",
            style = FluentTheme.aliasTokens.typography[FluentAliasTokens.TypographyTokens.Body1Strong]
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Card description goes here.",
            style = FluentTheme.aliasTokens.typography[FluentAliasTokens.TypographyTokens.Body2]
        )
    }
}
```

```kotlin
// XML View
<com.microsoft.fluentui.widget.CardView
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:cardCornerRadius="8dp"
    app:cardElevation="2dp">
    <!-- Card content -->
</com.microsoft.fluentui.widget.CardView>
```

### Checkbox

```kotlin
// Jetpack Compose
var checked by remember { mutableStateOf(false) }
CheckBox(
    checked = checked,
    onCheckedChanged = { checked = it },
    text = "Accept terms and conditions"
)
```

### DateTimePicker

```kotlin
// XML View — launch from Activity
DateTimePickerDialog.createDateDialog(
    context = this,
    dateRangeMode = DateRangeMode.NONE,
    initialDate = DateTime.now()
) { dateTime ->
    Log.d("Picker", "Selected: $dateTime")
}.show()

// Date range picker
DateTimePickerDialog.createDateRangeDialog(
    context = this,
    initialStartDate = DateTime.now(),
    initialEndDate = DateTime.now().plusDays(7)
) { start, end ->
    Log.d("Picker", "Range: $start to $end")
}.show()
```

### Dialog

```kotlin
// Fluent-styled AlertDialog
FluentAlertDialog.Builder(context)
    .setTitle("Confirm Action")
    .setMessage("Are you sure you want to proceed?")
    .setPositiveButton("Confirm") { dialog, _ ->
        dialog.dismiss()
    }
    .setNegativeButton("Cancel") { dialog, _ ->
        dialog.dismiss()
    }
    .show()
```

### Divider

```kotlin
// Jetpack Compose
Divider(
    modifier = Modifier.padding(horizontal = 16.dp),
    color = FluentTheme.aliasTokens.neutralStrokeColor[FluentAliasTokens.NeutralStrokeColorTokens.Stroke2]
)
```

```kotlin
// XML View
<com.microsoft.fluentui.widget.Separator
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />
```

### Drawer / BottomSheet

```kotlin
// Jetpack Compose — Bottom Drawer
var isOpen by remember { mutableStateOf(false) }

Drawer(
    drawerState = rememberDrawerState(DrawerValue.Closed),
    drawerContent = {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Drawer Title", style = FluentTheme.aliasTokens.typography[FluentAliasTokens.TypographyTokens.Title2])
            Spacer(modifier = Modifier.height(8.dp))
            Text("Drawer content goes here.")
        }
    },
    behaviorType = BehaviorType.BOTTOM
) {
    // Main content
    Button(onClick = { isOpen = true }) {
        Text("Open Drawer")
    }
}
```

```kotlin
// XML — BottomSheet via BottomSheetDialog
val drawer = BottomSheetDialog(this)
drawer.setContentView(R.layout.drawer_content)
drawer.show()
```

### ListItem

```kotlin
// Jetpack Compose
ListItem.Item(
    text = "List Item Title",
    subText = "Secondary text",
    leadingAccessoryContent = {
        Avatar(person = Person("Jane", "Doe"), size = AvatarSize.Size40)
    },
    trailingAccessoryContent = {
        Icon(painterResource(R.drawable.ic_chevron_right), contentDescription = null)
    },
    onClick = { /* handle tap */ }
)
```

```kotlin
// XML View
<com.microsoft.fluentui.listitem.ListItemView
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:title="List Item Title"
    app:subtitle="Secondary text"
    app:listItemAccessoryType="chevron" />
```

### NavigationBar / TopAppBar

```kotlin
// XML View
<com.microsoft.fluentui.appbarlayout.AppBarLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    <com.microsoft.fluentui.toolbar.Toolbar
        android:layout_width="match_parent"
        android:layout_height="?attr/actionBarSize"
        app:title="My Screen" />
</com.microsoft.fluentui.appbarlayout.AppBarLayout>
```

```kotlin
// Jetpack Compose
TopAppBar(
    title = { Text("My Screen") },
    navigationIcon = {
        IconButton(onClick = { /* back */ }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
        }
    },
    colors = TopAppBarDefaults.topAppBarColors(
        containerColor = FluentTheme.aliasTokens.brandBackgroundColor[FluentAliasTokens.BrandBackgroundColorTokens.BrandBackground1]
    )
)
```

### PeoplePicker

```kotlin
// XML View
val peoplePicker = PeoplePickerView(context)
peoplePicker.availablePersonas = listOf(
    Persona("Alice Smith", "alice@contoso.com"),
    Persona("Bob Jones", "bob@contoso.com")
)
peoplePicker.label = "To:"
peoplePicker.personaChipClickStyle = PeoplePickerView.PersonaChipClickStyle.SELECT_DESELECT
peoplePicker.onSearchTextChanged = { query, completion ->
    val results = searchPeople(query)
    completion(results)
}
```

### PillBar / TabLayout

```kotlin
// XML View
<com.microsoft.fluentui.tablayout.TabLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:tabMode="scrollable"
    app:tabGravity="start">
    <com.google.android.material.tabs.TabItem
        android:text="All" />
    <com.google.android.material.tabs.TabItem
        android:text="Unread" />
    <com.google.android.material.tabs.TabItem
        android:text="Flagged" />
</com.microsoft.fluentui.tablayout.TabLayout>
```

```kotlin
// Jetpack Compose — Pill bar
PillBar(
    pillMetaDataList = listOf(
        PillMetaData(text = "All", onClick = { /* filter all */ }),
        PillMetaData(text = "Unread", onClick = { /* filter unread */ }),
        PillMetaData(text = "Flagged", onClick = { /* filter flagged */ })
    ),
    selectedIndex = 0
)
```

### ProgressIndicator

```kotlin
// Jetpack Compose — Linear
LinearProgressIndicator(
    progress = 0.65f,
    modifier = Modifier.fillMaxWidth()
)

// Jetpack Compose — Circular
CircularProgressIndicator(
    size = CircularProgressIndicatorSize.Medium
)

// Jetpack Compose — Indeterminate
LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
```

```kotlin
// XML View
<com.microsoft.fluentui.progress.ProgressBar
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:progress="65"
    android:max="100" />
```

### SearchBar

```kotlin
// Jetpack Compose
var query by remember { mutableStateOf("") }

SearchBar(
    query = query,
    onQueryChange = { query = it },
    onSearch = { performSearch(it) },
    placeholder = "Search files...",
    modifier = Modifier.fillMaxWidth()
)
```

### Shimmer

```kotlin
// Jetpack Compose
Shimmer(
    modifier = Modifier
        .fillMaxWidth()
        .height(80.dp)
)

// Multiple shimmer lines
Column {
    repeat(3) {
        Shimmer(
            modifier = Modifier
                .fillMaxWidth()
                .height(16.dp)
                .padding(vertical = 4.dp)
        )
    }
}
```

### Snackbar

```kotlin
// XML View — Fluent-styled Snackbar
val snackbar = Snackbar.make(view, "File uploaded successfully", Snackbar.LENGTH_LONG)
snackbar.setAction("View") { openFile() }
snackbar.show()

// Fluent custom notification
val notification = FluentNotification(context)
notification.show(
    style = FluentNotification.Style.Accent,
    title = "Upload Complete",
    message = "File uploaded successfully",
    actionText = "View",
    actionOnClick = { openFile() }
)
```

### Switch / Toggle

```kotlin
// Jetpack Compose
var isEnabled by remember { mutableStateOf(false) }

ToggleSwitch(
    checkedState = isEnabled,
    onValueChange = { isEnabled = it },
    text = "Enable notifications"
)
```

### BottomNavigation / TabBar

```kotlin
// Jetpack Compose
var selectedIndex by remember { mutableStateOf(0) }

BottomNavigation(
    tabDataList = listOf(
        TabData(title = "Home", icon = painterResource(R.drawable.ic_home)),
        TabData(title = "Search", icon = painterResource(R.drawable.ic_search)),
        TabData(title = "Profile", icon = painterResource(R.drawable.ic_person))
    ),
    selectedIndex = selectedIndex,
    onTabSelected = { selectedIndex = it }
)
```

### TextField

```kotlin
// Jetpack Compose
var text by remember { mutableStateOf("") }

TextField(
    value = text,
    onValueChange = { text = it },
    label = "Name",
    assistiveText = "Required",
    hintText = "Enter your name",
    errorText = if (text.isBlank()) "Name is required" else null
)
```

```kotlin
// XML View
<com.microsoft.fluentui.textfield.TextFieldView
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:fluentui_label="Name"
    app:fluentui_hint="Enter your name"
    app:fluentui_assistiveText="Required" />
```

### Tooltip

```kotlin
// XML View
val tooltip = Tooltip(context)
tooltip.show(
    anchorView = targetView,
    text = "Helpful tip about this control",
    config = TooltipConfig(offsetY = -8)
)
```

---

## Theming and Customization

### FluentTheme (Compose)

```kotlin
@Composable
fun MyThemedApp() {
    FluentTheme(
        aliasTokens = CustomAliasTokens()
    ) {
        // All Fluent components use the custom tokens
        MyApp()
    }
}

class CustomAliasTokens : AliasTokens() {
    override val brandColor: TokenSet<FluentAliasTokens.BrandColorTokens, FluentColor>
        get() = TokenSet { token ->
            when (token) {
                FluentAliasTokens.BrandColorTokens.Color80 -> FluentColor(
                    light = Color(0xFF0F6CBD),
                    dark = Color(0xFF62ABF5)
                )
                FluentAliasTokens.BrandColorTokens.Color70 -> FluentColor(
                    light = Color(0xFF115EA3),
                    dark = Color(0xFF77B7F7)
                )
                else -> super.brandColor[token]
            }
        }
}
```

### Theme Attributes (XML Views)

```xml
<!-- res/values/themes.xml -->
<resources>
    <style name="AppTheme" parent="Theme.FluentUI">
        <!-- Brand colors -->
        <item name="fluentuiBrandColor">#0F6CBD</item>
        <item name="fluentuiBrandColorDark">#62ABF5</item>

        <!-- Typography overrides -->
        <item name="fluentuiTypographyBody1">@style/FluentTypography.Body1.Custom</item>

        <!-- Shape overrides -->
        <item name="fluentuiCornerRadiusMedium">8dp</item>
    </style>

    <style name="FluentTypography.Body1.Custom">
        <item name="android:textSize">15sp</item>
        <item name="android:fontFamily">@font/custom_font</item>
        <item name="android:textColor">?attr/fluentuiNeutralForeground1</item>
    </style>
</resources>
```

### Per-Component Token Overrides (Compose)

```kotlin
@Composable
fun CustomButton() {
    val customTokens = object : ButtonTokens() {
        override fun backgroundColor(buttonInfo: ButtonInfo): StateColor {
            return StateColor(
                rest = FluentTheme.aliasTokens.brandBackgroundColor[FluentAliasTokens.BrandBackgroundColorTokens.BrandBackground1].value,
                pressed = FluentTheme.aliasTokens.brandBackgroundColor[FluentAliasTokens.BrandBackgroundColorTokens.BrandBackground1Pressed].value,
                disabled = FluentTheme.aliasTokens.neutralBackgroundColor[FluentAliasTokens.NeutralBackgroundColorTokens.Background5].value
            )
        }

        override fun cornerRadius(buttonInfo: ButtonInfo): Dp = 12.dp
    }

    Button(
        style = ButtonStyle.AccentButton,
        buttonTokens = customTokens,
        onClick = { },
        text = "Custom Styled Button"
    )
}
```

---

## Dark Mode Support

### Automatic Support

Fluent UI Android automatically supports dark mode through the Android resource qualifier
system (`values-night/`) and Compose `isSystemInDarkTheme()`. All Fluent tokens resolve
to the appropriate variant.

```kotlin
// No extra code needed — FluentTheme handles dark mode automatically
FluentTheme {
    // Components render correctly in both light and dark mode
}
```

### Forcing Dark Mode

```kotlin
// Force dark mode in Application or Activity
AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)

// Query current mode
val isDarkMode = resources.configuration.uiMode and
    Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
```

### Custom Dark Mode Colors

When providing custom tokens, always supply both light and dark variants:

```kotlin
class CustomAliasTokens : AliasTokens() {
    override val neutralBackgroundColor: TokenSet<FluentAliasTokens.NeutralBackgroundColorTokens, FluentColor>
        get() = TokenSet { token ->
            when (token) {
                FluentAliasTokens.NeutralBackgroundColorTokens.Background1 -> FluentColor(
                    light = Color(0xFFFFFFFF),
                    dark = Color(0xFF1A1A1A)
                )
                FluentAliasTokens.NeutralBackgroundColorTokens.Background2 -> FluentColor(
                    light = Color(0xFFFAFAFA),
                    dark = Color(0xFF242424)
                )
                else -> super.neutralBackgroundColor[token]
            }
        }
}
```

---

## Material You Integration

Fluent UI Android can work alongside Material 3 / Material You. There are two integration
strategies.

### Strategy 1: Fluent Primary, Material Fallback

Use Fluent components for the primary UI and Material components only where Fluent has no
equivalent:

```kotlin
@Composable
fun MyScreen() {
    FluentTheme {
        Column {
            // Fluent component
            com.microsoft.fluentui.compose.Button(
                style = ButtonStyle.AccentButton,
                onClick = { },
                text = "Fluent Button"
            )

            // Material component where Fluent has no equivalent
            androidx.compose.material3.Slider(
                value = 0.5f,
                onValueChange = { },
                colors = SliderDefaults.colors(
                    thumbColor = FluentTheme.aliasTokens.brandBackgroundColor[
                        FluentAliasTokens.BrandBackgroundColorTokens.BrandBackground1
                    ].value
                )
            )
        }
    }
}
```

### Strategy 2: Material You Dynamic Color into Fluent Tokens

Extract the dynamic color from Material You and feed it into the Fluent brand ramp:

```kotlin
@Composable
fun DynamicFluentTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val dynamicScheme = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        dynamicLightColorScheme(context)
    } else null

    val customTokens = if (dynamicScheme != null) {
        DynamicAliasTokens(dynamicScheme.primary)
    } else {
        AliasTokens()  // Default Fluent tokens
    }

    FluentTheme(aliasTokens = customTokens) {
        content()
    }
}

class DynamicAliasTokens(private val primaryColor: Color) : AliasTokens() {
    override val brandColor: TokenSet<FluentAliasTokens.BrandColorTokens, FluentColor>
        get() = TokenSet { token ->
            // Generate a full brand ramp from the dynamic color
            val ramp = generateBrandRamp(primaryColor)
            ramp[token] ?: super.brandColor[token]
        }
}

fun generateBrandRamp(primary: Color): Map<FluentAliasTokens.BrandColorTokens, FluentColor> {
    val hsl = primary.toHsl()
    return mapOf(
        FluentAliasTokens.BrandColorTokens.Color10 to FluentColor(light = hsl.withLightness(0.95f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color20 to FluentColor(light = hsl.withLightness(0.90f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color30 to FluentColor(light = hsl.withLightness(0.82f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color40 to FluentColor(light = hsl.withLightness(0.72f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color50 to FluentColor(light = hsl.withLightness(0.62f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color60 to FluentColor(light = hsl.withLightness(0.55f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color70 to FluentColor(light = hsl.withLightness(0.48f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color80 to FluentColor(light = primary),
        FluentAliasTokens.BrandColorTokens.Color90 to FluentColor(light = hsl.withLightness(0.38f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color100 to FluentColor(light = hsl.withLightness(0.32f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color110 to FluentColor(light = hsl.withLightness(0.25f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color120 to FluentColor(light = hsl.withLightness(0.20f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color130 to FluentColor(light = hsl.withLightness(0.15f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color140 to FluentColor(light = hsl.withLightness(0.10f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color150 to FluentColor(light = hsl.withLightness(0.07f).toColor()),
        FluentAliasTokens.BrandColorTokens.Color160 to FluentColor(light = hsl.withLightness(0.04f).toColor())
    )
}
```

---

## Accessibility on Android

### TalkBack

Fluent components set `contentDescription` and accessibility roles by default:

```kotlin
// Button — automatically announces "Primary Action, button"
Button(
    style = ButtonStyle.AccentButton,
    onClick = { },
    text = "Primary Action"
)

// Override content description when needed
Button(
    style = ButtonStyle.AccentButton,
    onClick = { },
    text = "Submit",
    modifier = Modifier.semantics {
        contentDescription = "Submit the current form"
    }
)

// Avatar — announces person name
Avatar(
    person = Person("Jane", "Doe"),
    modifier = Modifier.semantics {
        contentDescription = "Jane Doe's profile picture"
    }
)
```

### Touch Target Sizes

All interactive Fluent components enforce a minimum 48x48dp touch target per Material
accessibility guidelines:

```kotlin
// Even small buttons maintain 48dp touch target
Button(
    style = ButtonStyle.AccentButton,
    size = ButtonSize.Small,  // Visual size 32dp, touch target 48dp
    onClick = { },
    text = "Small"
)
```

### Font Scaling

Fluent components use `sp` units for all text, automatically scaling with the system font size:

```kotlin
// Typography tokens use sp values
Text(
    text = "This text scales with system font size",
    style = FluentTheme.aliasTokens.typography[FluentAliasTokens.TypographyTokens.Body1],
    // Body1 = 14sp, scales automatically
)
```

### Reduced Animations

Respect the system animator duration scale:

```kotlin
val animatorScale = Settings.Global.getFloat(
    context.contentResolver,
    Settings.Global.ANIMATOR_DURATION_SCALE,
    1.0f
)

if (animatorScale == 0f) {
    // Animations disabled — skip transitions
} else {
    // Scale animation duration
    val adjustedDuration = (300 * animatorScale).toLong()
}
```

### Focus Navigation

Fluent components support D-pad and keyboard navigation with visible focus indicators:

```kotlin
// Compose — focus order is determined by layout order by default
// Override with focusRequester if needed
val focusRequester = remember { FocusRequester() }

TextField(
    value = text,
    onValueChange = { text = it },
    modifier = Modifier.focusRequester(focusRequester)
)

// Request focus programmatically
LaunchedEffect(Unit) {
    focusRequester.requestFocus()
}
```

### High Contrast

Fluent tokens include high-contrast variants. On Android, these activate when the user
enables accessibility display settings (bold text, high contrast text):

```kotlin
// Check high contrast
val isHighContrast = Settings.Secure.getInt(
    context.contentResolver,
    Settings.Secure.ACCESSIBILITY_HIGH_TEXT_CONTRAST_ENABLED,
    0
) == 1
```

---

## Common Patterns

### Navigation Pattern

```kotlin
@Composable
fun MainNavigation() {
    var selectedTab by remember { mutableStateOf(0) }

    Scaffold(
        bottomBar = {
            BottomNavigation(
                tabDataList = listOf(
                    TabData(title = "Home", icon = painterResource(R.drawable.ic_home)),
                    TabData(title = "Search", icon = painterResource(R.drawable.ic_search)),
                    TabData(title = "Profile", icon = painterResource(R.drawable.ic_person))
                ),
                selectedIndex = selectedTab,
                onTabSelected = { selectedTab = it }
            )
        }
    ) { padding ->
        when (selectedTab) {
            0 -> HomeScreen(Modifier.padding(padding))
            1 -> SearchScreen(Modifier.padding(padding))
            2 -> ProfileScreen(Modifier.padding(padding))
        }
    }
}
```

### List with People Pattern

```kotlin
@Composable
fun PeopleList(people: List<PersonData>) {
    LazyColumn {
        items(people) { person ->
            ListItem.Item(
                text = person.name,
                subText = person.email,
                leadingAccessoryContent = {
                    Avatar(
                        person = Person(person.firstName, person.lastName),
                        size = AvatarSize.Size40
                    )
                },
                trailingAccessoryContent = {
                    Icon(
                        painterResource(R.drawable.ic_chevron_right),
                        contentDescription = null
                    )
                },
                onClick = { navigateToProfile(person.id) }
            )
        }
    }
}
```

### Search with Filtering

```kotlin
@Composable
fun SearchableList(allItems: List<Item>) {
    var query by remember { mutableStateOf("") }
    val filteredItems = remember(query, allItems) {
        if (query.isBlank()) allItems
        else allItems.filter { it.title.contains(query, ignoreCase = true) }
    }

    Column {
        SearchBar(
            query = query,
            onQueryChange = { query = it },
            onSearch = { /* optional: trigger network search */ },
            placeholder = "Search items...",
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )

        LazyColumn {
            items(filteredItems) { item ->
                ListItem.Item(
                    text = item.title,
                    subText = item.description,
                    onClick = { openItem(item.id) }
                )
            }
        }
    }
}
```

### Form Pattern

```kotlin
@Composable
fun RegistrationForm() {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var agreeToTerms by remember { mutableStateOf(false) }
    var notifications by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Create Account",
            style = FluentTheme.aliasTokens.typography[FluentAliasTokens.TypographyTokens.Title1]
        )

        TextField(
            value = name,
            onValueChange = { name = it },
            label = "Full Name",
            hintText = "Enter your full name",
            errorText = if (name.isBlank()) "Name is required" else null
        )

        TextField(
            value = email,
            onValueChange = { email = it },
            label = "Email",
            hintText = "Enter your email address",
            errorText = if (email.isNotBlank() && !email.contains("@")) "Invalid email" else null
        )

        CheckBox(
            checked = agreeToTerms,
            onCheckedChanged = { agreeToTerms = it },
            text = "I agree to the terms and conditions"
        )

        ToggleSwitch(
            checkedState = notifications,
            onValueChange = { notifications = it },
            text = "Enable push notifications"
        )

        Button(
            style = ButtonStyle.AccentButton,
            size = ButtonSize.Large,
            onClick = { submitForm(name, email) },
            text = "Create Account",
            enabled = name.isNotBlank() && email.contains("@") && agreeToTerms,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
```

### Bottom Sheet Action Menu

```kotlin
@Composable
fun ActionSheet(onDismiss: () -> Unit) {
    Drawer(
        drawerState = rememberDrawerState(DrawerValue.Open),
        drawerContent = {
            Column(modifier = Modifier.padding(vertical = 8.dp)) {
                Text(
                    "Actions",
                    style = FluentTheme.aliasTokens.typography[FluentAliasTokens.TypographyTokens.Title3],
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
                ListItem.Item(
                    text = "Share",
                    leadingAccessoryContent = { Icon(painterResource(R.drawable.ic_share), null) },
                    onClick = { handleShare(); onDismiss() }
                )
                ListItem.Item(
                    text = "Copy Link",
                    leadingAccessoryContent = { Icon(painterResource(R.drawable.ic_copy), null) },
                    onClick = { handleCopy(); onDismiss() }
                )
                ListItem.Item(
                    text = "Delete",
                    leadingAccessoryContent = { Icon(painterResource(R.drawable.ic_delete), null) },
                    onClick = { handleDelete(); onDismiss() }
                )
            }
        },
        behaviorType = BehaviorType.BOTTOM,
        onDismiss = onDismiss
    ) { }
}
```
