---
name: Fluent UI Forms
description: >
  Form orchestration with Fluent UI React v9 — Field component, validation display, Formik + Yup
  integration, React Hook Form + Zod integration, multi-step wizard patterns, and accessible
  form design.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fluent form
  - formik fluent
  - yup fluent
  - react hook form fluent
  - form validation fluent
  - fluent field
  - fluent input validation
  - zod fluent
  - fluent form wizard
  - fluent form pattern
---

# Fluent UI Forms — Knowledge Base

## Overview

Fluent UI React v9 provides a comprehensive set of form components that follow the Microsoft
design language. The key differentiator from raw HTML forms is the **Field component** — a wrapper
that unifies label, validation message, hint text, and required indicator for any input.

**Key packages:**
- `@fluentui/react-components` — All form components (Field, Input, Textarea, Select, etc.)
- `@fluentui/react-datepicker-compat` — DatePicker component (compat layer)
- `@fluentui/react-timepicker-compat` — TimePicker component (compat layer)

**Form architecture in Fluent v9:**

```
FluentProvider (theme context)
└── <form> (native HTML)
    └── Field (label + validation + hint wrapper)
        └── Input / Textarea / Select / Combobox / etc. (actual control)
```

Fluent form components are **controlled by default** — they accept `value` and `onChange` props.
They integrate with any state management or form library because they follow standard React
controlled component conventions.

**External resources:**
- Field component: https://react.fluentui.dev/?path=/docs/components-field--docs
- Input component: https://react.fluentui.dev/?path=/docs/components-input--docs
- Form patterns: https://fluent2.microsoft.design/components/web/react/field

---

## Form Components

### Field — The Universal Wrapper

The `Field` component is the foundation of every Fluent form. It wraps any input component and
provides consistent label placement, validation messages, hint text, and required indicators.

```tsx
import { Field, Input } from "@fluentui/react-components";

<Field
  label="Email address"
  validationMessage="Please enter a valid email"
  validationState="error"
  hint="We'll never share your email"
  required
>
  <Input type="email" value={email} onChange={handleChange} />
</Field>
```

**Field props:**
| Prop | Type | Description |
|---|---|---|
| `label` | `string \| JSX` | Label text above or beside the input |
| `validationMessage` | `string \| JSX` | Message shown below input during validation |
| `validationState` | `"error" \| "warning" \| "success" \| "none"` | Controls icon and color of validation message |
| `hint` | `string \| JSX` | Persistent help text below the input |
| `required` | `boolean \| string` | Shows required indicator; string overrides default text |
| `orientation` | `"vertical" \| "horizontal"` | Layout direction for label relative to input |
| `size` | `"small" \| "medium" \| "large"` | Adjusts label and message sizing |

**Important:** Field does NOT render an input itself. It always wraps a child input component.
This composable design means Field works with Input, Textarea, Combobox, Dropdown, DatePicker,
or any custom input component.

### Input

Standard text input for single-line text entry.

```tsx
import { Input } from "@fluentui/react-components";

<Input
  type="text"           // "text" | "email" | "password" | "number" | "tel" | "url"
  value={value}
  onChange={(e, data) => setValue(data.value)}
  placeholder="Enter text..."
  contentBefore={<SearchRegular />}    // Icon or text before input
  contentAfter={<DismissRegular />}    // Icon or button after input
  appearance="outline"  // "outline" | "underline" | "filled-darker" | "filled-lighter"
  size="medium"         // "small" | "medium" | "large"
  disabled={false}
/>
```

**Key point:** The `onChange` callback receives `(event, data)` where `data.value` is the new
string value. This is different from native React where you use `event.target.value`.

### Textarea

Multi-line text input with auto-resize support.

```tsx
import { Textarea } from "@fluentui/react-components";

<Textarea
  value={value}
  onChange={(e, data) => setValue(data.value)}
  placeholder="Enter description..."
  resize="vertical"   // "none" | "horizontal" | "vertical" | "both"
  rows={4}
  appearance="outline"
/>
```

### Select

Native HTML select wrapper styled with Fluent tokens.

```tsx
import { Select } from "@fluentui/react-components";

<Field label="Country">
  <Select value={country} onChange={(e, data) => setCountry(data.value)}>
    <option value="">Select a country...</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
    <option value="de">Germany</option>
  </Select>
</Field>
```

### Combobox and Dropdown

For richer selection experiences with filtering, multi-select, and custom rendering.

```tsx
import { Combobox, Option } from "@fluentui/react-components";

<Field label="Assign to">
  <Combobox
    value={selectedUser}
    onOptionSelect={(e, data) => setSelectedUser(data.optionText ?? "")}
    placeholder="Search users..."
    freeform       // Allows typed text not in options
    multiselect    // Multiple selection mode
  >
    <Option value="user1">Alice Johnson</Option>
    <Option value="user2">Bob Smith</Option>
    <Option value="user3">Carol Williams</Option>
  </Combobox>
</Field>
```

**Dropdown** is similar but without the text input — it's a button that opens a listbox:

```tsx
import { Dropdown, Option } from "@fluentui/react-components";

<Field label="Priority">
  <Dropdown
    value={priority}
    onOptionSelect={(e, data) => setPriority(data.optionText ?? "")}
    placeholder="Select priority"
  >
    <Option>Low</Option>
    <Option>Medium</Option>
    <Option>High</Option>
    <Option>Critical</Option>
  </Dropdown>
</Field>
```

### Checkbox, RadioGroup, Switch

```tsx
import { Checkbox, RadioGroup, Radio, Switch } from "@fluentui/react-components";

// Checkbox
<Checkbox
  label="Accept terms and conditions"
  checked={accepted}
  onChange={(e, data) => setAccepted(data.checked)}
/>

// RadioGroup
<Field label="Notification preference">
  <RadioGroup value={pref} onChange={(e, data) => setPref(data.value)}>
    <Radio value="email" label="Email" />
    <Radio value="sms" label="SMS" />
    <Radio value="push" label="Push notification" />
  </RadioGroup>
</Field>

// Switch
<Switch
  label="Enable dark mode"
  checked={darkMode}
  onChange={(e, data) => setDarkMode(data.checked)}
/>
```

### SpinButton, Slider, Rating

```tsx
import { SpinButton, Slider } from "@fluentui/react-components";
import { Rating } from "@fluentui/react-components";

// SpinButton — numeric input with increment/decrement
<Field label="Quantity">
  <SpinButton
    value={qty}
    onChange={(e, data) => setQty(data.value ?? 0)}
    min={1}
    max={100}
    step={1}
  />
</Field>

// Slider — continuous or discrete range
<Field label="Volume">
  <Slider
    value={volume}
    onChange={(e, data) => setVolume(data.value)}
    min={0}
    max={100}
    step={5}
  />
</Field>

// Rating — star rating input
<Rating
  value={rating}
  onChange={(e, data) => setRating(data.value)}
  max={5}
/>
```

### DatePicker and TimePicker

These are compat components that wrap the v8 implementations with v9 styling:

```tsx
import { DatePicker } from "@fluentui/react-datepicker-compat";
import { TimePicker } from "@fluentui/react-timepicker-compat";

// DatePicker
<Field label="Start date">
  <DatePicker
    value={startDate}
    onSelectDate={(date) => setStartDate(date)}
    placeholder="Select a date..."
    formatDate={(date) => date?.toLocaleDateString() ?? ""}
  />
</Field>

// TimePicker
<Field label="Meeting time">
  <TimePicker
    selectedTime={meetingTime}
    onTimeChange={(e, data) => setMeetingTime(data.selectedTime)}
    startHour={8}
    endHour={18}
    increment={30}   // 30-minute intervals
  />
</Field>
```

**Install separately:**
```bash
npm install @fluentui/react-datepicker-compat @fluentui/react-timepicker-compat
```

---

## Field Component Deep-Dive

### Validation States

Field supports four validation states, each rendering a different icon and color:

```tsx
// Error — red icon, red text
<Field validationState="error" validationMessage="This field is required">
  <Input />
</Field>

// Warning — yellow icon, yellow text
<Field validationState="warning" validationMessage="Password is weak">
  <Input type="password" />
</Field>

// Success — green icon, green text
<Field validationState="success" validationMessage="Username is available">
  <Input />
</Field>

// None — no icon, neutral text (informational)
<Field validationState="none" validationMessage="Must be 8+ characters">
  <Input type="password" />
</Field>
```

### Label and Hint

```tsx
// Label with required indicator
<Field label="Full name" required>
  <Input />
</Field>

// Custom required text
<Field label="Email" required="(mandatory)">
  <Input type="email" />
</Field>

// Hint text — persistent help below the input
<Field label="Password" hint="Use at least 8 characters with a mix of letters and numbers">
  <Input type="password" />
</Field>
```

### Orientation

```tsx
// Vertical (default) — label above input
<Field label="Name" orientation="vertical">
  <Input />
</Field>

// Horizontal — label beside input (useful for settings forms)
<Field label="Display name" orientation="horizontal">
  <Input />
</Field>
```

Horizontal orientation renders the label in a fixed-width column (typically 33%) with the input
occupying the remaining space.

---

## Formik + Yup Integration

Reference: Paul Gildea's guide — https://dev.to/paulgildea/fluent-ui-react-v9-with-formik-and-yup-523g

### Setup

```bash
npm install formik yup
npm install @types/yup   # TypeScript users — Yup ships types since v1
```

### Creating Fluent-Wrapped Formik Fields

The key pattern is creating adapter components that bridge Formik's field state with Fluent's
Field + Input components:

```tsx
import { Field, Input } from "@fluentui/react-components";
import { useField } from "formik";

interface FluentFieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

export const FluentTextField: React.FC<FluentFieldProps> = ({
  name,
  label,
  type = "text",
  required = false,
  hint,
  placeholder,
}) => {
  const [field, meta] = useField(name);

  const hasError = meta.touched && !!meta.error;

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      validationState={hasError ? "error" : "none"}
      validationMessage={hasError ? meta.error : undefined}
    >
      <Input
        type={type}
        name={field.name}
        value={field.value}
        onChange={(e, data) => {
          field.onChange({ target: { name: field.name, value: data.value } });
        }}
        onBlur={field.onBlur}
        placeholder={placeholder}
      />
    </Field>
  );
};
```

**Important:** Formik's `field.onChange` expects a React synthetic event with `target.name` and
`target.value`. Since Fluent's Input `onChange` provides `(event, data)`, you must construct the
expected shape manually.

### Validation Schema with Yup

```tsx
import * as Yup from "yup";

const signUpSchema = Yup.object({
  firstName: Yup.string()
    .min(2, "Must be at least 2 characters")
    .required("First name is required"),
  lastName: Yup.string()
    .min(2, "Must be at least 2 characters")
    .required("Last name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(8, "Must be at least 8 characters")
    .matches(/[A-Z]/, "Must contain an uppercase letter")
    .matches(/[0-9]/, "Must contain a number")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});
```

### Complete Form Example

```tsx
import { Formik, Form } from "formik";
import { Button, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "480px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalL,
  },
});

export const SignUpForm: React.FC = () => {
  const classes = useStyles();

  return (
    <Formik
      initialValues={{
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
      }}
      validationSchema={signUpSchema}
      onSubmit={(values, { setSubmitting }) => {
        console.log("Form submitted:", values);
        setSubmitting(false);
      }}
    >
      {({ isSubmitting }) => (
        <Form className={classes.form}>
          <FluentTextField name="firstName" label="First name" required />
          <FluentTextField name="lastName" label="Last name" required />
          <FluentTextField name="email" label="Email" type="email" required />
          <FluentTextField name="password" label="Password" type="password" required />
          <FluentTextField
            name="confirmPassword"
            label="Confirm password"
            type="password"
            required
          />
          <div className={classes.actions}>
            <Button appearance="secondary" type="reset">
              Clear
            </Button>
            <Button appearance="primary" type="submit" disabled={isSubmitting}>
              Sign Up
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
```

---

## React Hook Form + Zod Integration

### Setup

```bash
npm install react-hook-form @hookform/resolvers zod
```

### Controller Pattern for Fluent Components

React Hook Form's `Controller` component bridges RHF with controlled Fluent components:

```tsx
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Input } from "@fluentui/react-components";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().min(2, "Must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  age: z.number().min(18, "Must be at least 18").max(120, "Invalid age"),
});

type FormData = z.infer<typeof schema>;

export const ProfileForm: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", email: "", age: 18 },
  });

  const onSubmit = (data: FormData) => {
    console.log("Submitted:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="displayName"
        control={control}
        render={({ field }) => (
          <Field
            label="Display name"
            required
            validationState={errors.displayName ? "error" : "none"}
            validationMessage={errors.displayName?.message}
          >
            <Input
              value={field.value}
              onChange={(e, data) => field.onChange(data.value)}
              onBlur={field.onBlur}
            />
          </Field>
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Field
            label="Email"
            required
            validationState={errors.email ? "error" : "none"}
            validationMessage={errors.email?.message}
          >
            <Input
              type="email"
              value={field.value}
              onChange={(e, data) => field.onChange(data.value)}
              onBlur={field.onBlur}
            />
          </Field>
        )}
      />

      <Button appearance="primary" type="submit">
        Save Profile
      </Button>
    </form>
  );
};
```

### Reusable Controller Wrapper

To reduce boilerplate, create a generic wrapper:

```tsx
import { Controller, useFormContext, FieldPath, FieldValues } from "react-hook-form";
import { Field, Input, FieldProps } from "@fluentui/react-components";

interface FluentControlledFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

export function FluentControlledField<T extends FieldValues>({
  name,
  label,
  type = "text",
  required = false,
  hint,
  placeholder,
}: FluentControlledFieldProps<T>) {
  const { control, formState: { errors } } = useFormContext<T>();
  const error = errors[name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field
          label={label}
          required={required}
          hint={hint}
          validationState={error ? "error" : "none"}
          validationMessage={error?.message as string | undefined}
        >
          <Input
            type={type}
            value={field.value ?? ""}
            onChange={(e, data) => field.onChange(data.value)}
            onBlur={field.onBlur}
            placeholder={placeholder}
          />
        </Field>
      )}
    />
  );
}
```

---

## Multi-Step Wizard Pattern

### Step State Management

```tsx
import React, { useState, useCallback } from "react";
import {
  Button,
  ProgressBar,
  makeStyles,
  tokens,
  Text,
} from "@fluentui/react-components";

interface WizardStep {
  title: string;
  component: React.ComponentType<WizardStepProps>;
  validate?: () => boolean | Promise<boolean>;
}

interface WizardStepProps {
  data: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}

const useStyles = makeStyles({
  wizard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "600px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: tokens.spacingVerticalXL,
  },
});

export const FormWizard: React.FC<{ steps: WizardStep[]; onComplete: (data: Record<string, unknown>) => void }> = ({
  steps,
  onComplete,
}) => {
  const classes = useStyles();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const handleUpdate = useCallback((updates: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = async () => {
    const step = steps[currentStep];
    if (step.validate) {
      const isValid = await step.validate();
      if (!isValid) return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const CurrentComponent = steps[currentStep].component;
  const progress = (currentStep + 1) / steps.length;

  return (
    <div className={classes.wizard}>
      <div className={classes.header}>
        <Text weight="semibold" size={500}>
          Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
        </Text>
        <ProgressBar value={progress} />
      </div>

      <CurrentComponent data={formData} onUpdate={handleUpdate} />

      <div className={classes.navigation}>
        <Button
          appearance="secondary"
          disabled={currentStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button appearance="primary" onClick={handleNext}>
          {currentStep === steps.length - 1 ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  );
};
```

### Per-Step Validation

Each step can use its own validation schema. With React Hook Form + Zod:

```tsx
const step1Schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
});

const step2Schema = z.object({
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, "Invalid phone number"),
});

const step3Schema = z.object({
  plan: z.enum(["basic", "pro", "enterprise"]),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});
```

---

## Form Accessibility

### Error Announcements with aria-live

When validation errors appear dynamically, they must be announced to screen readers:

```tsx
// Field handles this automatically — validationMessage is wrapped in an aria-live region.
// For custom error summaries, use aria-live explicitly:

<div role="alert" aria-live="assertive">
  {Object.keys(errors).length > 0 && (
    <Text>
      Please fix {Object.keys(errors).length} error(s) before submitting.
    </Text>
  )}
</div>
```

### Required Field Indicators

Field's `required` prop automatically:
1. Adds a visual asterisk (*) after the label
2. Sets `aria-required="true"` on the input
3. Optionally renders custom required text

```tsx
<Field label="Email" required>           {/* Shows "*" */}
  <Input type="email" />
</Field>

<Field label="Email" required="(required)">  {/* Shows "(required)" */}
  <Input type="email" />
</Field>
```

### Field Grouping

For related fields, use semantic grouping:

```tsx
<fieldset style={{ border: "none", padding: 0, margin: 0 }}>
  <legend>
    <Text weight="semibold" size={400}>Contact Information</Text>
  </legend>
  <Field label="Phone" required>
    <Input type="tel" />
  </Field>
  <Field label="Email" required>
    <Input type="email" />
  </Field>
</fieldset>
```

### Focus Management on Validation Errors

After form submission with errors, move focus to the first invalid field:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const isValid = await validate();

  if (!isValid) {
    // Focus the first field with an error
    const firstError = document.querySelector('[aria-invalid="true"]');
    if (firstError instanceof HTMLElement) {
      firstError.focus();
    }
  }
};
```

---

## Common Form Patterns

### Login Form

```tsx
export const LoginForm: React.FC = () => {
  const classes = useFormStyles();

  return (
    <Formik
      initialValues={{ email: "", password: "", rememberMe: false }}
      validationSchema={Yup.object({
        email: Yup.string().email("Invalid email").required("Required"),
        password: Yup.string().required("Required"),
      })}
      onSubmit={handleLogin}
    >
      {({ isSubmitting }) => (
        <Form className={classes.form}>
          <FluentTextField name="email" label="Email" type="email" required />
          <FluentTextField name="password" label="Password" type="password" required />
          <Checkbox name="rememberMe" label="Remember me" />
          <Button appearance="primary" type="submit" disabled={isSubmitting}>
            Sign in
          </Button>
          <Link href="/forgot-password">Forgot password?</Link>
        </Form>
      )}
    </Formik>
  );
};
```

### Settings Form with Sections

```tsx
const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalXL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: tokens.spacingVerticalXL,
  },
});

export const SettingsForm: React.FC = () => {
  const classes = useStyles();

  return (
    <form>
      <div className={classes.section}>
        <Text as="h2" size={500} weight="semibold">Profile</Text>
        <Field label="Display name" orientation="horizontal">
          <Input />
        </Field>
        <Field label="Bio" orientation="horizontal">
          <Textarea resize="vertical" />
        </Field>
      </div>

      <div className={classes.section}>
        <Text as="h2" size={500} weight="semibold">Notifications</Text>
        <Switch label="Email notifications" />
        <Switch label="Push notifications" />
        <Field label="Digest frequency" orientation="horizontal">
          <Dropdown>
            <Option>Daily</Option>
            <Option>Weekly</Option>
            <Option>Monthly</Option>
          </Dropdown>
        </Field>
      </div>

      <Button appearance="primary" type="submit">Save changes</Button>
    </form>
  );
};
```

### Inline Editing

```tsx
export const InlineEditField: React.FC<{ value: string; onSave: (v: string) => void }> = ({
  value,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <Text onClick={() => setEditing(true)} style={{ cursor: "pointer" }}>
        {value} <EditRegular />
      </Text>
    );
  }

  return (
    <div style={{ display: "flex", gap: tokens.spacingHorizontalS }}>
      <Input
        value={draft}
        onChange={(e, data) => setDraft(data.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
      />
      <Button icon={<CheckmarkRegular />} onClick={() => { onSave(draft); setEditing(false); }} />
      <Button icon={<DismissRegular />} onClick={() => { setDraft(value); setEditing(false); }} />
    </div>
  );
};
```

### Filter Form

```tsx
export const FilterBar: React.FC = () => {
  const classes = useFilterStyles();

  return (
    <div className={classes.filterBar} role="search" aria-label="Filter results">
      <Input
        contentBefore={<SearchRegular />}
        placeholder="Search..."
        onChange={(e, data) => onSearch(data.value)}
      />
      <Dropdown placeholder="Status" onOptionSelect={onStatusChange}>
        <Option>Active</Option>
        <Option>Inactive</Option>
        <Option>Pending</Option>
      </Dropdown>
      <Combobox placeholder="Tags" multiselect onOptionSelect={onTagsChange}>
        {tags.map((tag) => <Option key={tag}>{tag}</Option>)}
      </Combobox>
      <Button appearance="subtle" icon={<FilterDismissRegular />} onClick={onClearFilters}>
        Clear
      </Button>
    </div>
  );
};
```

---

## Cross-References

- **Core components and tokens** — See `fluent-design-system` skill for token reference, color system, and component catalog
- **Custom input components** — See `fluent-extensibility` skill for building custom inputs that work with Field
- **Styling form components** — See `fluent-griffel` skill for `makeStyles` and token usage
- **Next.js forms** — See `fluent-nextjs` skill for Server Actions integration with Fluent forms
- **Charts in forms** — See `fluent-charting` skill if embedding visualizations alongside form data

**Reference files:**
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-forms/references/form-patterns.md` — Complete API reference, validation patterns, and wizard implementation
