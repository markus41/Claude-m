# Azure AD B2C UI Customization with Fluent Design

## Overview

Azure AD B2C provides identity-as-a-service with customizable user-facing pages for authentication flows. By default, B2C renders generic Microsoft-branded pages. To deliver a seamless brand experience, you replace these with custom HTML templates styled to match your Fluent UI application.

Since B2C pages run outside your React app (they are served by Azure AD B2C infrastructure and rendered in the user's browser before your app loads), you cannot use FluentProvider or Fluent React components directly. Instead, you replicate Fluent's visual language using pure HTML and CSS that mirrors Fluent design token values.

## Architecture

```
User clicks "Sign In"
  → Browser redirects to B2C tenant (yourtenant.b2clogin.com)
    → B2C loads your custom HTML template from CDN/Blob Storage
      → B2C injects its form controls into <div id="api">
        → User authenticates
          → B2C redirects back to your app with tokens
```

Your custom template controls everything outside the `<div id="api">` element. Inside that element, B2C injects its own HTML which you style via CSS selectors.

## Custom HTML Template Structure

### Minimal Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In</title>
  <style>
    /* Inline or link to external CSS */
  </style>
</head>
<body>
  <div id="api" role="main"></div>
</body>
</html>
```

### Production Template with Fluent Branding

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Sign In — Contoso</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://your-cdn.azureedge.net/b2c/fluent-b2c.css" />
</head>
<body>
  <header class="b2c-header">
    <div class="b2c-header-inner">
      <img src="https://your-cdn.azureedge.net/b2c/logo.svg" alt="Contoso" class="b2c-logo" />
    </div>
  </header>

  <main class="b2c-main">
    <div class="b2c-card">
      <div class="b2c-card-header">
        <h1 class="b2c-title">Welcome back</h1>
        <p class="b2c-subtitle">Sign in to your Contoso account</p>
      </div>
      <div id="api" role="main" aria-label="Sign in form"></div>
    </div>
  </main>

  <footer class="b2c-footer">
    <p>&copy; 2026 Contoso Ltd. All rights reserved.</p>
    <nav>
      <a href="https://contoso.com/privacy">Privacy</a>
      <a href="https://contoso.com/terms">Terms</a>
    </nav>
  </footer>
</body>
</html>
```

## CSS Mapping from Fluent Tokens to B2C Classes

### Complete Token Map

```css
:root {
  /* ── Brand Colors ── */
  --fluent-colorBrandBackground: #0f6cbd;
  --fluent-colorBrandBackgroundHover: #115ea3;
  --fluent-colorBrandBackgroundPressed: #0c3b5e;
  --fluent-colorBrandBackgroundSelected: #115ea3;
  --fluent-colorBrandForeground1: #0f6cbd;
  --fluent-colorBrandForeground2: #115ea3;
  --fluent-colorBrandStroke1: #0f6cbd;

  /* ── Neutral Colors ── */
  --fluent-colorNeutralBackground1: #ffffff;
  --fluent-colorNeutralBackground2: #fafafa;
  --fluent-colorNeutralBackground3: #f5f5f5;
  --fluent-colorNeutralForeground1: #242424;
  --fluent-colorNeutralForeground2: #616161;
  --fluent-colorNeutralForeground3: #707070;
  --fluent-colorNeutralForeground4: #999999;
  --fluent-colorNeutralForegroundDisabled: #bdbdbd;
  --fluent-colorNeutralStroke1: #d1d1d1;
  --fluent-colorNeutralStroke2: #e0e0e0;
  --fluent-colorNeutralStrokeAccessible: #616161;

  /* ── Status Colors ── */
  --fluent-colorPaletteRedForeground1: #bc2f32;
  --fluent-colorPaletteRedBackground1: #fdf3f4;
  --fluent-colorPaletteGreenForeground1: #0e7a0d;

  /* ── Typography ── */
  --fluent-fontFamilyBase: 'Segoe UI', 'Segoe UI Web (West European)', -apple-system,
    BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
  --fluent-fontSizeBase200: 12px;
  --fluent-fontSizeBase300: 14px;
  --fluent-fontSizeBase400: 16px;
  --fluent-fontSizeBase500: 20px;
  --fluent-fontSizeBase600: 24px;
  --fluent-fontWeightRegular: 400;
  --fluent-fontWeightSemibold: 600;
  --fluent-fontWeightBold: 700;
  --fluent-lineHeightBase300: 20px;
  --fluent-lineHeightBase400: 22px;

  /* ── Spacing ── */
  --fluent-spacingHorizontalS: 8px;
  --fluent-spacingHorizontalM: 12px;
  --fluent-spacingHorizontalL: 16px;
  --fluent-spacingVerticalS: 8px;
  --fluent-spacingVerticalM: 12px;
  --fluent-spacingVerticalL: 16px;
  --fluent-spacingVerticalXL: 20px;
  --fluent-spacingVerticalXXL: 24px;

  /* ── Shape ── */
  --fluent-borderRadiusSmall: 2px;
  --fluent-borderRadiusMedium: 4px;
  --fluent-borderRadiusLarge: 6px;
  --fluent-borderRadiusXLarge: 8px;

  /* ── Elevation ── */
  --fluent-shadow4: 0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);
  --fluent-shadow8: 0 4px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);
  --fluent-shadow16: 0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);

  /* ── Transitions ── */
  --fluent-durationFast: 0.1s;
  --fluent-durationNormal: 0.2s;
  --fluent-curveEasyEase: cubic-bezier(0.33, 0, 0.67, 1);
}
```

### Page Layout Styles

```css
body {
  margin: 0;
  font-family: var(--fluent-fontFamilyBase);
  font-size: var(--fluent-fontSizeBase300);
  color: var(--fluent-colorNeutralForeground1);
  background-color: var(--fluent-colorNeutralBackground2);
  line-height: var(--fluent-lineHeightBase300);
}

.b2c-header {
  background-color: var(--fluent-colorNeutralBackground1);
  border-bottom: 1px solid var(--fluent-colorNeutralStroke2);
  padding: var(--fluent-spacingVerticalM) var(--fluent-spacingHorizontalL);
}

.b2c-header-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.b2c-logo {
  height: 32px;
}

.b2c-main {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: var(--fluent-spacingVerticalXXL);
}

.b2c-card {
  background-color: var(--fluent-colorNeutralBackground1);
  border-radius: var(--fluent-borderRadiusXLarge);
  box-shadow: var(--fluent-shadow16);
  padding: 40px;
  width: 100%;
  max-width: 440px;
}

.b2c-title {
  font-size: var(--fluent-fontSizeBase600);
  font-weight: var(--fluent-fontWeightBold);
  margin: 0 0 var(--fluent-spacingVerticalS) 0;
  color: var(--fluent-colorNeutralForeground1);
}

.b2c-subtitle {
  font-size: var(--fluent-fontSizeBase300);
  color: var(--fluent-colorNeutralForeground2);
  margin: 0 0 var(--fluent-spacingVerticalXXL) 0;
}

.b2c-footer {
  text-align: center;
  padding: var(--fluent-spacingVerticalL);
  color: var(--fluent-colorNeutralForeground3);
  font-size: var(--fluent-fontSizeBase200);
}

.b2c-footer a {
  color: var(--fluent-colorBrandForeground1);
  text-decoration: none;
  margin: 0 var(--fluent-spacingHorizontalS);
}
```

### B2C Injected Element Styles

```css
/* ── Labels ── */
#api label {
  display: block;
  font-size: var(--fluent-fontSizeBase300);
  font-weight: var(--fluent-fontWeightSemibold);
  color: var(--fluent-colorNeutralForeground1);
  margin-bottom: 4px;
}

/* ── Text Inputs ── */
#api input[type="email"],
#api input[type="password"],
#api input[type="text"],
#api input[type="tel"] {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--fluent-fontFamilyBase);
  font-size: var(--fluent-fontSizeBase300);
  line-height: var(--fluent-lineHeightBase300);
  color: var(--fluent-colorNeutralForeground1);
  background-color: var(--fluent-colorNeutralBackground1);
  border: 1px solid var(--fluent-colorNeutralStroke1);
  border-bottom: 2px solid var(--fluent-colorNeutralStrokeAccessible);
  border-radius: var(--fluent-borderRadiusMedium);
  padding: 5px 12px;
  height: 32px;
  outline: none;
  transition: border-color var(--fluent-durationFast) var(--fluent-curveEasyEase);
}

#api input:focus {
  border-bottom-color: var(--fluent-colorBrandStroke1);
}

#api input::placeholder {
  color: var(--fluent-colorNeutralForeground4);
}

/* ── Entry Items (field groups) ── */
#api .entry-item {
  margin-bottom: var(--fluent-spacingVerticalL);
}

/* ── Primary Button ── */
#api button[type="submit"],
#api #next {
  width: 100%;
  background-color: var(--fluent-colorBrandBackground);
  color: #ffffff;
  border: none;
  border-radius: var(--fluent-borderRadiusMedium);
  padding: 5px 20px;
  min-height: 32px;
  font-family: var(--fluent-fontFamilyBase);
  font-size: var(--fluent-fontSizeBase300);
  font-weight: var(--fluent-fontWeightSemibold);
  cursor: pointer;
  transition: background-color var(--fluent-durationFast) var(--fluent-curveEasyEase);
  margin-top: var(--fluent-spacingVerticalM);
}

#api button[type="submit"]:hover,
#api #next:hover {
  background-color: var(--fluent-colorBrandBackgroundHover);
}

#api button[type="submit"]:active,
#api #next:active {
  background-color: var(--fluent-colorBrandBackgroundPressed);
}

/* ── Secondary / Cancel Button ── */
#api #cancel {
  width: 100%;
  background-color: transparent;
  color: var(--fluent-colorNeutralForeground1);
  border: 1px solid var(--fluent-colorNeutralStroke1);
  border-radius: var(--fluent-borderRadiusMedium);
  padding: 5px 20px;
  min-height: 32px;
  font-family: var(--fluent-fontFamilyBase);
  font-size: var(--fluent-fontSizeBase300);
  font-weight: var(--fluent-fontWeightSemibold);
  cursor: pointer;
  margin-top: var(--fluent-spacingVerticalS);
}

/* ── Links ── */
#api a {
  color: var(--fluent-colorBrandForeground1);
  text-decoration: none;
  font-size: var(--fluent-fontSizeBase300);
}

#api a:hover {
  text-decoration: underline;
  color: var(--fluent-colorBrandForeground2);
}

/* ── Error Messages ── */
#api .error {
  color: var(--fluent-colorPaletteRedForeground1);
  font-size: var(--fluent-fontSizeBase200);
  margin-top: 4px;
}

#api .error.itemLevel {
  background-color: var(--fluent-colorPaletteRedBackground1);
  border-radius: var(--fluent-borderRadiusSmall);
  padding: 4px 8px;
}

#api .error.pageLevel {
  background-color: var(--fluent-colorPaletteRedBackground1);
  border: 1px solid var(--fluent-colorPaletteRedForeground1);
  border-radius: var(--fluent-borderRadiusMedium);
  padding: var(--fluent-spacingVerticalM) var(--fluent-spacingHorizontalL);
  margin-bottom: var(--fluent-spacingVerticalL);
}

/* ── Divider ── */
#api .divider {
  display: flex;
  align-items: center;
  margin: var(--fluent-spacingVerticalXL) 0;
  color: var(--fluent-colorNeutralForeground3);
  font-size: var(--fluent-fontSizeBase200);
}

#api .divider::before,
#api .divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--fluent-colorNeutralStroke2);
}

#api .divider::before { margin-right: var(--fluent-spacingHorizontalM); }
#api .divider::after  { margin-left:  var(--fluent-spacingHorizontalM); }

/* ── Social / Identity Provider Buttons ── */
#api .options .accountButton {
  width: 100%;
  display: flex;
  align-items: center;
  background-color: var(--fluent-colorNeutralBackground1);
  border: 1px solid var(--fluent-colorNeutralStroke1);
  border-radius: var(--fluent-borderRadiusMedium);
  padding: 5px 12px;
  min-height: 32px;
  font-family: var(--fluent-fontFamilyBase);
  font-size: var(--fluent-fontSizeBase300);
  cursor: pointer;
  margin-bottom: var(--fluent-spacingVerticalS);
  transition: background-color var(--fluent-durationFast) var(--fluent-curveEasyEase);
}

#api .options .accountButton:hover {
  background-color: var(--fluent-colorNeutralBackground3);
}
```

## Sign-in Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In — Contoso</title>
  <link rel="stylesheet" href="https://your-cdn.azureedge.net/b2c/fluent-b2c.css" />
</head>
<body>
  <header class="b2c-header">
    <div class="b2c-header-inner">
      <img src="https://your-cdn.azureedge.net/b2c/logo.svg" alt="Contoso" />
    </div>
  </header>
  <main class="b2c-main">
    <div class="b2c-card">
      <div class="b2c-card-header">
        <h1 class="b2c-title">Welcome back</h1>
        <p class="b2c-subtitle">Sign in to your account</p>
      </div>
      <div id="api" role="main" aria-label="Sign in"></div>
    </div>
  </main>
  <footer class="b2c-footer">
    <p>&copy; 2026 Contoso Ltd.</p>
  </footer>
</body>
</html>
```

## Sign-up Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Create Account — Contoso</title>
  <link rel="stylesheet" href="https://your-cdn.azureedge.net/b2c/fluent-b2c.css" />
</head>
<body>
  <header class="b2c-header">
    <div class="b2c-header-inner">
      <img src="https://your-cdn.azureedge.net/b2c/logo.svg" alt="Contoso" />
    </div>
  </header>
  <main class="b2c-main">
    <div class="b2c-card b2c-card--wide">
      <div class="b2c-card-header">
        <h1 class="b2c-title">Create your account</h1>
        <p class="b2c-subtitle">Fill in the details below to get started</p>
      </div>
      <div id="api" role="main" aria-label="Create account"></div>
    </div>
  </main>
  <footer class="b2c-footer">
    <p>&copy; 2026 Contoso Ltd.</p>
  </footer>
</body>
</html>
```

The wider card variant:

```css
.b2c-card--wide {
  max-width: 540px;
}
```

## Password Reset Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password — Contoso</title>
  <link rel="stylesheet" href="https://your-cdn.azureedge.net/b2c/fluent-b2c.css" />
</head>
<body>
  <header class="b2c-header">
    <div class="b2c-header-inner">
      <img src="https://your-cdn.azureedge.net/b2c/logo.svg" alt="Contoso" />
    </div>
  </header>
  <main class="b2c-main">
    <div class="b2c-card">
      <div class="b2c-card-header">
        <h1 class="b2c-title">Reset your password</h1>
        <p class="b2c-subtitle">Enter your email address and we will send you a verification code</p>
      </div>
      <div id="api" role="main" aria-label="Reset password"></div>
    </div>
  </main>
  <footer class="b2c-footer">
    <p>&copy; 2026 Contoso Ltd.</p>
  </footer>
</body>
</html>
```

## Custom Policy Integration

### User Flow Configuration

For user flows (the simpler approach), configure the custom page URI in the Azure portal under **User flows > [flow] > Page layouts > Custom page content URI**.

### Custom Policy XML

For custom policies (Identity Experience Framework), define content definitions in the policy XML:

```xml
<BuildingBlocks>
  <ContentDefinitions>
    <!-- Unified sign-in / sign-up page -->
    <ContentDefinition Id="api.signuporsignin">
      <LoadUri>https://your-cdn.azureedge.net/b2c/templates/unified.html</LoadUri>
      <RecoveryUri>~/common/default_page_error.html</RecoveryUri>
      <DataUri>urn:com:microsoft:aad:b2c:elements:contract:unifiedssp:2.1.7</DataUri>
      <Metadata>
        <Item Key="DisplayName">Sign In or Sign Up</Item>
      </Metadata>
    </ContentDefinition>

    <!-- Sign-up page -->
    <ContentDefinition Id="api.localaccountsignup">
      <LoadUri>https://your-cdn.azureedge.net/b2c/templates/signup.html</LoadUri>
      <RecoveryUri>~/common/default_page_error.html</RecoveryUri>
      <DataUri>urn:com:microsoft:aad:b2c:elements:contract:selfasserted:2.1.7</DataUri>
    </ContentDefinition>

    <!-- Password reset page -->
    <ContentDefinition Id="api.localaccountpasswordreset">
      <LoadUri>https://your-cdn.azureedge.net/b2c/templates/password-reset.html</LoadUri>
      <RecoveryUri>~/common/default_page_error.html</RecoveryUri>
      <DataUri>urn:com:microsoft:aad:b2c:elements:contract:selfasserted:2.1.7</DataUri>
    </ContentDefinition>

    <!-- MFA page -->
    <ContentDefinition Id="api.phonefactor">
      <LoadUri>https://your-cdn.azureedge.net/b2c/templates/mfa.html</LoadUri>
      <RecoveryUri>~/common/default_page_error.html</RecoveryUri>
      <DataUri>urn:com:microsoft:aad:b2c:elements:contract:multifactor:1.2.5</DataUri>
    </ContentDefinition>

    <!-- Error page -->
    <ContentDefinition Id="api.error">
      <LoadUri>https://your-cdn.azureedge.net/b2c/templates/error.html</LoadUri>
      <RecoveryUri>~/common/default_page_error.html</RecoveryUri>
      <DataUri>urn:com:microsoft:aad:b2c:elements:contract:globalexception:1.2.1</DataUri>
    </ContentDefinition>
  </ContentDefinitions>
</BuildingBlocks>
```

### CORS Configuration

Templates must be served from a CORS-enabled origin. For Azure Blob Storage:

```bash
az storage cors add \
  --services b \
  --methods GET OPTIONS \
  --origins "https://yourtenant.b2clogin.com" \
  --allowed-headers "*" \
  --max-age 200 \
  --account-name yourstorageaccount
```

## JavaScript Customization for B2C Pages

B2C allows JavaScript in custom templates (must be enabled in the page contract). Use it for dynamic behavior:

### Enable JavaScript in Custom Policy

```xml
<ContentDefinition Id="api.signuporsignin">
  <DataUri>urn:com:microsoft:aad:b2c:elements:contract:unifiedssp:2.1.7</DataUri>
  <!-- The :contract: URI enables JavaScript -->
</ContentDefinition>
```

### Password Strength Indicator

```javascript
document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.getElementById("newPassword");
  if (!passwordInput) return;

  const indicator = document.createElement("div");
  indicator.className = "password-strength";
  indicator.setAttribute("aria-live", "polite");
  passwordInput.parentNode.insertBefore(indicator, passwordInput.nextSibling);

  passwordInput.addEventListener("input", function () {
    const val = this.value;
    let strength = 0;
    if (val.length >= 8) strength++;
    if (val.length >= 12) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
    const colors = [
      "var(--fluent-colorPaletteRedForeground1)",
      "#e87506",
      "#c19c00",
      "#0e7a0d",
      "var(--fluent-colorPaletteGreenForeground1)",
    ];

    indicator.textContent = val.length > 0 ? labels[Math.min(strength, 4)] : "";
    indicator.style.color = colors[Math.min(strength, 4)];
    indicator.style.fontSize = "var(--fluent-fontSizeBase200)";
    indicator.style.marginTop = "4px";
  });
});
```

### Auto-Focus First Input

```javascript
document.addEventListener("DOMContentLoaded", function () {
  // B2C may render elements asynchronously; wait briefly
  setTimeout(function () {
    var firstInput = document.querySelector("#api input:not([type='hidden'])");
    if (firstInput) firstInput.focus();
  }, 500);
});
```

### Show/Hide Password Toggle

```javascript
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    var passwordFields = document.querySelectorAll("#api input[type='password']");
    passwordFields.forEach(function (field) {
      var toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = "Show";
      toggle.className = "password-toggle";
      toggle.setAttribute("aria-label", "Toggle password visibility");
      toggle.style.cssText =
        "position:absolute;right:8px;top:50%;transform:translateY(-50%);" +
        "background:none;border:none;color:var(--fluent-colorBrandForeground1);" +
        "cursor:pointer;font-size:var(--fluent-fontSizeBase200);font-family:var(--fluent-fontFamilyBase);";

      var wrapper = field.parentElement;
      wrapper.style.position = "relative";
      wrapper.appendChild(toggle);

      toggle.addEventListener("click", function () {
        var isPassword = field.type === "password";
        field.type = isPassword ? "text" : "password";
        toggle.textContent = isPassword ? "Hide" : "Show";
      });
    });
  }, 500);
});
```

## Hosting and Deployment

### Azure Blob Storage with CDN

1. Create a storage account with static website hosting enabled
2. Upload templates to the `$web` container
3. Configure Azure CDN for HTTPS and caching
4. Set CORS rules for the B2C tenant origin
5. Reference the CDN URL in B2C page configuration

### File Organization

```
$web/
  b2c/
    templates/
      unified.html          # Sign-in / sign-up
      signup.html            # Sign-up only
      password-reset.html    # Password reset
      mfa.html               # Multi-factor
      error.html             # Error page
    css/
      fluent-b2c.css         # Fluent-mapped styles
    js/
      b2c-enhancements.js    # Password strength, auto-focus, etc.
    images/
      logo.svg               # Company logo
      background.jpg         # Optional background image
```

## References

- Customize the user interface: https://learn.microsoft.com/en-us/azure/active-directory-b2c/customize-ui
- Customize with HTML: https://learn.microsoft.com/en-us/azure/active-directory-b2c/customize-ui-with-html
- Custom policy overview: https://learn.microsoft.com/en-us/azure/active-directory-b2c/custom-policy-overview
- Page layout versions: https://learn.microsoft.com/en-us/azure/active-directory-b2c/page-layout
- JavaScript and page layout: https://learn.microsoft.com/en-us/azure/active-directory-b2c/javascript-and-page-layout
