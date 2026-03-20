---
name: fluent-ui-design:form
description: Generate a Fluent UI form with validation — supports Formik/Yup or React Hook Form/Zod.
argument-hint: "<form-type> [--library=<formik|rhf>] [--multi-step] [--fields=<field1,field2,...>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Generate a Fluent UI Form

Create a complete, accessible form using Fluent UI React v9 with integrated validation.

## Arguments

- `<form-type>` — The kind of form to generate (e.g., `login`, `signup`, `contact`, `settings`, `filter`, `onboarding`, or a custom name)
- `--library=<formik|rhf>` — Validation library to use (default: `rhf`)
  - `formik` — Formik + Yup
  - `rhf` — React Hook Form + Zod
- `--multi-step` — Generate a multi-step wizard wrapper with progress indicator
- `--fields=<field1,field2,...>` — Comma-separated list of fields to include (e.g., `name,email,password,role`)

## Workflow

### 1. Determine form type and configuration

Parse the arguments to determine:
- Form type / name (PascalCase for component name, e.g., `contact` becomes `ContactForm`)
- Which validation library to use
- Whether to generate a wizard wrapper
- Which fields to include (if `--fields` not provided, infer from form type)

**Default field sets by form type:**

| Type | Default Fields |
|---|---|
| `login` | email, password, rememberMe (checkbox) |
| `signup` | firstName, lastName, email, password, confirmPassword, acceptTerms (checkbox) |
| `contact` | firstName, lastName, email, phone, subject (select), message (textarea) |
| `settings` | displayName, email, bio (textarea), notifications (switch), theme (dropdown) |
| `filter` | search (input), status (dropdown), dateRange (date), category (combobox) |
| Custom | Use `--fields` or prompt the user |

### 2. Install dependencies

Check if dependencies are already installed by reading `package.json`. If not present, install:

**For Formik + Yup:**
```bash
npm install formik yup @fluentui/react-components
```

**For React Hook Form + Zod:**
```bash
npm install react-hook-form @hookform/resolvers zod @fluentui/react-components
```

### 3. Generate validation schema

**Read reference:** Load `${CLAUDE_PLUGIN_ROOT}/skills/fluent-forms/references/form-patterns.md` for validation patterns.

Create the validation schema file (`<FormName>.schema.ts`):

**Formik + Yup example:**
```tsx
import * as Yup from "yup";

export const contactFormSchema = Yup.object({
  firstName: Yup.string().min(2).required("First name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  // ... per field
});

export type ContactFormValues = Yup.InferType<typeof contactFormSchema>;
```

**React Hook Form + Zod example:**
```tsx
import { z } from "zod";

export const contactFormSchema = z.object({
  firstName: z.string().min(2, "Must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  // ... per field
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
```

### 4. Generate form component with Field wrappers

Create the main form component (`<FormName>.tsx`):

- Import `Field` and appropriate input components from `@fluentui/react-components`
- Wrap every input in a `Field` component with `label`, `required`, `validationState`, and `validationMessage`
- Use `makeStyles` with design tokens for layout
- Use the adapter pattern from the reference for connecting Fluent inputs to the form library

**For Formik:** Use `useField` hook to connect each input:
```tsx
const [field, meta] = useField(name);
// Map meta.touched + meta.error to Field's validationState/validationMessage
```

**For React Hook Form:** Use `Controller` component:
```tsx
<Controller name={name} control={control} render={({ field }) => (
  <Field validationState={errors[name] ? "error" : "none"} validationMessage={errors[name]?.message}>
    <Input value={field.value} onChange={(_, data) => field.onChange(data.value)} />
  </Field>
)} />
```

### 5. Add accessibility

Every generated form must include:

- **Error summary:** An `aria-live="assertive"` region that announces the count of errors after failed submission
- **Required indicators:** `required` prop on every required `Field` (renders `*` and sets `aria-required`)
- **Focus management:** On submission failure, focus the first field with `aria-invalid="true"`
- **Form role:** Use native `<form>` element with `noValidate` to prevent browser validation and let the library handle it
- **Fieldset grouping:** Group related fields with `<fieldset>` and `<legend>` when the form has sections

```tsx
// Error summary pattern
{submitCount > 0 && Object.keys(errors).length > 0 && (
  <div role="alert" aria-live="assertive">
    Please fix {Object.keys(errors).length} error(s) before submitting.
  </div>
)}
```

### 6. If `--multi-step`: generate wizard wrapper

When the `--multi-step` flag is provided:

1. **Read reference:** Load `${CLAUDE_PLUGIN_ROOT}/skills/fluent-forms/references/form-patterns.md` for the wizard implementation
2. Split the fields into logical steps (or let the user specify step boundaries)
3. Generate a `FormWizard` shell component with:
   - `ProgressBar` from `@fluentui/react-components` showing current progress
   - Step indicator with numbered circles (active, completed, upcoming states)
   - Back / Next / Submit navigation buttons
   - Per-step validation — only validate the current step's fields before allowing Next
4. Generate individual step components, each receiving `data`, `errors`, `onUpdate` props
5. Wire steps together with validation functions

**Wizard file structure:**
```
<FormName>/
├── <FormName>.tsx            # Wizard shell
├── <FormName>.schema.ts      # Validation schemas (one per step)
├── steps/
│   ├── Step1Personal.tsx     # Step 1 component
│   ├── Step2Details.tsx      # Step 2 component
│   └── Step3Confirm.tsx      # Confirmation step
└── index.ts                  # Barrel export
```

## Generated File Structure

**Single form:**
```
<FormName>/
├── <FormName>.tsx            # Form component
├── <FormName>.schema.ts      # Validation schema
└── index.ts                  # Barrel export
```

**Multi-step form:**
```
<FormName>/
├── <FormName>.tsx            # Wizard shell
├── <FormName>.schema.ts      # Validation schemas
├── steps/
│   ├── Step1<Name>.tsx
│   ├── Step2<Name>.tsx
│   └── ...
└── index.ts                  # Barrel export
```

## Quality Checklist

- [ ] All visual values use Fluent design tokens (no hardcoded colors, spacing, or radii)
- [ ] Every input is wrapped in a `Field` component
- [ ] Validation schema covers all required fields
- [ ] `validationState` and `validationMessage` are wired to the form library's error state
- [ ] `aria-live` error summary present
- [ ] Required fields have `required` prop on `Field`
- [ ] Form uses `noValidate` attribute
- [ ] Submission button shows loading state via `disabled` + text change
- [ ] Reset / Clear button present
- [ ] Responsive layout (single-column on mobile)
- [ ] TypeScript types exported for form values
- [ ] Works in light, dark, and high-contrast themes
