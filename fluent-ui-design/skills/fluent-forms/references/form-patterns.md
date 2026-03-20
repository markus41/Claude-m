# Fluent UI Forms — Patterns & API Reference

## Field API Reference

The `Field` component is the universal wrapper for all Fluent UI form inputs. It provides
consistent labeling, validation display, hint text, and accessibility markup.

**Import:**
```tsx
import { Field } from "@fluentui/react-components";
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string \| Slot<"label">` | — | Label content rendered above or beside the input |
| `validationMessage` | `string \| Slot<"span">` | — | Validation or error message below the input |
| `validationState` | `"error" \| "warning" \| "success" \| "none"` | `"none"` | Determines validation message icon and color |
| `validationMessageIcon` | `Slot<"span">` | auto | Override the default validation icon |
| `hint` | `string \| Slot<"span">` | — | Persistent help text below the input (below validation message) |
| `required` | `boolean \| string` | `false` | Shows required indicator; string value overrides default "*" text |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | Layout direction of label relative to input |
| `size` | `"small" \| "medium" \| "large"` | `"medium"` | Adjusts the size of label, message, and hint text |

### Validation State Rendering

Each `validationState` value maps to specific visual treatment:

| State | Icon | Color Token | Use Case |
|---|---|---|---|
| `"error"` | `ErrorCircle12Filled` | `colorPaletteRedForeground1` | Failed validation |
| `"warning"` | `Warning12Filled` | `colorPaletteDarkOrangeForeground1` | Non-blocking issue |
| `"success"` | `CheckmarkCircle12Filled` | `colorPaletteGreenForeground1` | Passed validation |
| `"none"` | No icon | `colorNeutralForeground3` | Informational message |

### Accessibility Behavior

Field automatically provides:
- Associates label with input via `htmlFor` / `id` pairing
- Associates validation message and hint via `aria-describedby`
- Sets `aria-invalid="true"` when `validationState="error"`
- Sets `aria-required="true"` when `required` is set
- Wraps `validationMessage` in an implicit `aria-live="polite"` region

### Slot Architecture

Field uses Fluent's slot system. Each sub-element can be customized:

```tsx
<Field
  label={{ children: "Custom label", htmlFor: "my-input", style: { fontWeight: 600 } }}
  validationMessage={{
    children: (
      <>
        <strong>Error:</strong> This field is required
      </>
    ),
  }}
  hint={{ children: "Help text", style: { fontStyle: "italic" } }}
>
  <Input id="my-input" />
</Field>
```

---

## Input Component API Reference

**Import:**
```tsx
import { Input } from "@fluentui/react-components";
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Controlled input value |
| `defaultValue` | `string` | — | Uncontrolled initial value |
| `onChange` | `(e, data: InputOnChangeData) => void` | — | Change handler; `data.value` is the new string |
| `type` | `"text" \| "email" \| "password" \| "number" \| "tel" \| "url" \| "search"` | `"text"` | HTML input type |
| `appearance` | `"outline" \| "underline" \| "filled-darker" \| "filled-lighter"` | `"outline"` | Visual style |
| `size` | `"small" \| "medium" \| "large"` | `"medium"` | Input size |
| `contentBefore` | `Slot<"span">` | — | Content rendered before the input text (icon, prefix) |
| `contentAfter` | `Slot<"span">` | — | Content rendered after the input text (icon, suffix, button) |
| `disabled` | `boolean` | `false` | Disables the input |
| `placeholder` | `string` | — | Placeholder text |

### onChange Data Shape

```tsx
interface InputOnChangeData {
  value: string;   // The new input value
}
```

**Critical difference from native React:** Fluent components pass `(event, data)` to `onChange`,
where `data.value` contains the value. Native React passes only the event, and you use
`event.target.value`. This distinction matters when integrating with form libraries.

---

## Formik + Yup Complete Walkthrough

### Step 1: Install Dependencies

```bash
npm install formik yup @fluentui/react-components
```

### Step 2: Define Yup Validation Schema

```tsx
import * as Yup from "yup";

export const contactFormSchema = Yup.object({
  firstName: Yup.string()
    .trim()
    .min(2, "Must be at least 2 characters")
    .max(50, "Must be 50 characters or fewer")
    .required("First name is required"),

  lastName: Yup.string()
    .trim()
    .min(2, "Must be at least 2 characters")
    .max(50, "Must be 50 characters or fewer")
    .required("Last name is required"),

  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),

  phone: Yup.string()
    .matches(
      /^(\+?\d{1,3}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?[\d\-.\s]{6,}$/,
      "Please enter a valid phone number"
    )
    .optional(),

  subject: Yup.string()
    .oneOf(["general", "support", "sales", "feedback"], "Please select a subject")
    .required("Subject is required"),

  message: Yup.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be 2000 characters or fewer")
    .required("Message is required"),

  preferredContact: Yup.string()
    .oneOf(["email", "phone", "either"], "Invalid preference")
    .required("Please select a contact preference"),

  newsletter: Yup.boolean().default(false),

  acceptTerms: Yup.boolean()
    .oneOf([true], "You must accept the terms and conditions")
    .required("You must accept the terms and conditions"),
});

export type ContactFormValues = Yup.InferType<typeof contactFormSchema>;
```

### Step 3: Create Fluent Adapter Components

```tsx
import React from "react";
import { Field, Input, Textarea, Select, Checkbox } from "@fluentui/react-components";
import { RadioGroup, Radio } from "@fluentui/react-components";
import { useField, useFormikContext } from "formik";

// --- Text Input Adapter ---
interface FormikInputProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  contentBefore?: React.ReactNode;
  contentAfter?: React.ReactNode;
}

export const FormikInput: React.FC<FormikInputProps> = ({
  name,
  label,
  type = "text",
  required = false,
  hint,
  placeholder,
  contentBefore,
  contentAfter,
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
        value={field.value ?? ""}
        onChange={(_, data) => {
          field.onChange({ target: { name: field.name, value: data.value } });
        }}
        onBlur={field.onBlur}
        placeholder={placeholder}
        contentBefore={contentBefore}
        contentAfter={contentAfter}
      />
    </Field>
  );
};

// --- Textarea Adapter ---
interface FormikTextareaProps {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  rows?: number;
}

export const FormikTextarea: React.FC<FormikTextareaProps> = ({
  name,
  label,
  required = false,
  hint,
  placeholder,
  rows = 4,
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
      <Textarea
        name={field.name}
        value={field.value ?? ""}
        onChange={(_, data) => {
          field.onChange({ target: { name: field.name, value: data.value } });
        }}
        onBlur={field.onBlur}
        placeholder={placeholder}
        rows={rows}
        resize="vertical"
      />
    </Field>
  );
};

// --- Select Adapter ---
interface FormikSelectProps {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const FormikSelect: React.FC<FormikSelectProps> = ({
  name,
  label,
  required = false,
  hint,
  options,
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
      <Select
        name={field.name}
        value={field.value ?? ""}
        onChange={(_, data) => {
          field.onChange({ target: { name: field.name, value: data.value } });
        }}
        onBlur={field.onBlur}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </Field>
  );
};

// --- RadioGroup Adapter ---
interface FormikRadioGroupProps {
  name: string;
  label: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const FormikRadioGroup: React.FC<FormikRadioGroupProps> = ({
  name,
  label,
  required = false,
  options,
}) => {
  const [field, meta] = useField(name);
  const hasError = meta.touched && !!meta.error;

  return (
    <Field
      label={label}
      required={required}
      validationState={hasError ? "error" : "none"}
      validationMessage={hasError ? meta.error : undefined}
    >
      <RadioGroup
        value={field.value ?? ""}
        onChange={(_, data) => {
          field.onChange({ target: { name: field.name, value: data.value } });
        }}
      >
        {options.map((opt) => (
          <Radio key={opt.value} value={opt.value} label={opt.label} />
        ))}
      </RadioGroup>
    </Field>
  );
};

// --- Checkbox Adapter ---
interface FormikCheckboxProps {
  name: string;
  label: string;
  required?: boolean;
}

export const FormikCheckbox: React.FC<FormikCheckboxProps> = ({
  name,
  label,
  required = false,
}) => {
  const [field, meta, helpers] = useField(name);
  const hasError = meta.touched && !!meta.error;

  return (
    <Field
      validationState={hasError ? "error" : "none"}
      validationMessage={hasError ? meta.error : undefined}
    >
      <Checkbox
        label={label}
        checked={!!field.value}
        onChange={(_, data) => {
          helpers.setValue(!!data.checked);
          helpers.setTouched(true);
        }}
        required={required}
      />
    </Field>
  );
};
```

### Step 4: Assemble the Complete Form

```tsx
import React from "react";
import { Formik, Form } from "formik";
import {
  Button,
  Text,
  Divider,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { MailRegular, PhoneRegular, SendRegular } from "@fluentui/react-icons";

import { contactFormSchema, ContactFormValues } from "./contactFormSchema";
import {
  FormikInput,
  FormikTextarea,
  FormikSelect,
  FormikRadioGroup,
  FormikCheckbox,
} from "./FormikAdapters";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "560px",
    padding: tokens.spacingHorizontalXL,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalM,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalL,
  },
  errorSummary: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    padding: tokens.spacingVerticalS + " " + tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorPaletteRedForeground1,
  },
});

const initialValues: ContactFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "" as "general",
  message: "",
  preferredContact: "" as "email",
  newsletter: false,
  acceptTerms: false,
};

export const ContactForm: React.FC = () => {
  const classes = useStyles();

  const handleSubmit = async (
    values: ContactFormValues,
    { setSubmitting, resetForm }: { setSubmitting: (v: boolean) => void; resetForm: () => void }
  ) => {
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={contactFormSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, errors, submitCount }) => (
        <Form className={classes.form} noValidate>
          <Text as="h1" size={700} weight="bold">
            Contact Us
          </Text>

          {submitCount > 0 && Object.keys(errors).length > 0 && (
            <div className={classes.errorSummary} role="alert" aria-live="assertive">
              <Text weight="semibold">
                Please fix {Object.keys(errors).length} error(s) before submitting.
              </Text>
            </div>
          )}

          {/* Personal Information */}
          <div className={classes.section}>
            <Text size={400} weight="semibold">Personal Information</Text>
            <div className={classes.row}>
              <FormikInput name="firstName" label="First name" required />
              <FormikInput name="lastName" label="Last name" required />
            </div>
            <FormikInput
              name="email"
              label="Email"
              type="email"
              required
              contentBefore={<MailRegular />}
            />
            <FormikInput
              name="phone"
              label="Phone"
              type="tel"
              contentBefore={<PhoneRegular />}
              hint="Optional — include country code for international numbers"
            />
          </div>

          <Divider />

          {/* Message */}
          <div className={classes.section}>
            <Text size={400} weight="semibold">Your Message</Text>
            <FormikSelect
              name="subject"
              label="Subject"
              required
              placeholder="Select a subject..."
              options={[
                { value: "general", label: "General Inquiry" },
                { value: "support", label: "Technical Support" },
                { value: "sales", label: "Sales" },
                { value: "feedback", label: "Feedback" },
              ]}
            />
            <FormikTextarea
              name="message"
              label="Message"
              required
              placeholder="How can we help you?"
              hint="Minimum 10 characters"
              rows={5}
            />
          </div>

          <Divider />

          {/* Preferences */}
          <div className={classes.section}>
            <Text size={400} weight="semibold">Preferences</Text>
            <FormikRadioGroup
              name="preferredContact"
              label="Preferred contact method"
              required
              options={[
                { value: "email", label: "Email" },
                { value: "phone", label: "Phone" },
                { value: "either", label: "Either" },
              ]}
            />
            <FormikCheckbox name="newsletter" label="Subscribe to our newsletter" />
            <FormikCheckbox
              name="acceptTerms"
              label="I accept the terms and conditions"
              required
            />
          </div>

          <div className={classes.actions}>
            <Button appearance="secondary" type="reset" disabled={isSubmitting}>
              Clear
            </Button>
            <Button
              appearance="primary"
              type="submit"
              disabled={isSubmitting}
              icon={<SendRegular />}
              iconPosition="after"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
```

---

## React Hook Form + Zod Complete Walkthrough

### Step 1: Install Dependencies

```bash
npm install react-hook-form @hookform/resolvers zod @fluentui/react-components
```

### Step 2: Define Zod Validation Schema

```tsx
import { z } from "zod";

export const registrationSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be 30 characters or fewer")
      .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores"),

    email: z
      .string()
      .email("Please enter a valid email address"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),

    confirmPassword: z.string(),

    role: z.enum(["viewer", "editor", "admin"], {
      errorMap: () => ({ message: "Please select a role" }),
    }),

    department: z
      .string()
      .min(1, "Please select a department"),

    bio: z
      .string()
      .max(500, "Bio must be 500 characters or fewer")
      .optional(),

    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(false),
      sms: z.boolean().default(false),
    }),

    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms of service" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegistrationFormData = z.infer<typeof registrationSchema>;
```

### Step 3: Create RHF Controller Adapters

```tsx
import React from "react";
import {
  Controller,
  Control,
  FieldErrors,
  FieldPath,
  FieldValues,
  Path,
  PathValue,
} from "react-hook-form";
import {
  Field,
  Input,
  Textarea,
  Select,
  Dropdown,
  Option,
  Checkbox,
  RadioGroup,
  Radio,
  Switch,
  Combobox,
} from "@fluentui/react-components";

// --- Generic Input Controller ---
interface RHFInputProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  contentBefore?: React.ReactNode;
  contentAfter?: React.ReactNode;
}

export function RHFInput<T extends FieldValues>({
  name,
  control,
  errors,
  label,
  type = "text",
  required = false,
  hint,
  placeholder,
  contentBefore,
  contentAfter,
}: RHFInputProps<T>) {
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
            onChange={(_, data) => field.onChange(data.value)}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
            placeholder={placeholder}
            contentBefore={contentBefore}
            contentAfter={contentAfter}
          />
        </Field>
      )}
    />
  );
}

// --- Textarea Controller ---
interface RHFTextareaProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  rows?: number;
}

export function RHFTextarea<T extends FieldValues>({
  name,
  control,
  errors,
  label,
  required = false,
  hint,
  placeholder,
  rows = 4,
}: RHFTextareaProps<T>) {
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
          <Textarea
            value={field.value ?? ""}
            onChange={(_, data) => field.onChange(data.value)}
            onBlur={field.onBlur}
            ref={field.ref}
            placeholder={placeholder}
            rows={rows}
            resize="vertical"
          />
        </Field>
      )}
    />
  );
}

// --- Select Controller ---
interface RHFSelectProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  label: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function RHFSelect<T extends FieldValues>({
  name,
  control,
  errors,
  label,
  required = false,
  options,
  placeholder,
}: RHFSelectProps<T>) {
  const error = errors[name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field
          label={label}
          required={required}
          validationState={error ? "error" : "none"}
          validationMessage={error?.message as string | undefined}
        >
          <Select
            value={field.value ?? ""}
            onChange={(_, data) => field.onChange(data.value)}
            onBlur={field.onBlur}
            ref={field.ref}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
    />
  );
}

// --- Dropdown Controller ---
interface RHFDropdownProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  label: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function RHFDropdown<T extends FieldValues>({
  name,
  control,
  errors,
  label,
  required = false,
  options,
  placeholder,
}: RHFDropdownProps<T>) {
  const error = errors[name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field
          label={label}
          required={required}
          validationState={error ? "error" : "none"}
          validationMessage={error?.message as string | undefined}
        >
          <Dropdown
            value={options.find((o) => o.value === field.value)?.label ?? ""}
            onOptionSelect={(_, data) => field.onChange(data.optionValue)}
            onBlur={field.onBlur}
            placeholder={placeholder}
          >
            {options.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      )}
    />
  );
}

// --- Checkbox Controller ---
interface RHFCheckboxProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  label: string;
  required?: boolean;
}

export function RHFCheckbox<T extends FieldValues>({
  name,
  control,
  errors,
  label,
  required = false,
}: RHFCheckboxProps<T>) {
  const error = errors[name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field
          validationState={error ? "error" : "none"}
          validationMessage={error?.message as string | undefined}
        >
          <Checkbox
            label={label}
            checked={!!field.value}
            onChange={(_, data) => field.onChange(!!data.checked)}
            ref={field.ref}
            required={required}
          />
        </Field>
      )}
    />
  );
}

// --- RadioGroup Controller ---
interface RHFRadioGroupProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  label: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

export function RHFRadioGroup<T extends FieldValues>({
  name,
  control,
  errors,
  label,
  required = false,
  options,
}: RHFRadioGroupProps<T>) {
  const error = errors[name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field
          label={label}
          required={required}
          validationState={error ? "error" : "none"}
          validationMessage={error?.message as string | undefined}
        >
          <RadioGroup
            value={field.value ?? ""}
            onChange={(_, data) => field.onChange(data.value)}
          >
            {options.map((opt) => (
              <Radio key={opt.value} value={opt.value} label={opt.label} />
            ))}
          </RadioGroup>
        </Field>
      )}
    />
  );
}
```

### Step 4: Assemble the Complete Form

```tsx
import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Text,
  Divider,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  PersonRegular,
  MailRegular,
  LockClosedRegular,
  PersonAddRegular,
} from "@fluentui/react-icons";

import { registrationSchema, RegistrationFormData } from "./registrationSchema";
import {
  RHFInput,
  RHFTextarea,
  RHFDropdown,
  RHFRadioGroup,
  RHFCheckbox,
} from "./RHFAdapters";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "560px",
    padding: tokens.spacingHorizontalXL,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalM,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalL,
  },
});

export const RegistrationForm: React.FC = () => {
  const classes = useStyles();
  const methods = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      department: "",
      bio: "",
      notifications: { email: true, push: false, sms: false },
      acceptTerms: undefined,
    },
    mode: "onBlur",       // Validate on blur
    reValidateMode: "onChange", // Re-validate on change after first blur
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = methods;

  const onSubmit = async (data: RegistrationFormData) => {
    await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={classes.form} noValidate>
      <Text as="h1" size={700} weight="bold">
        Create Account
      </Text>

      <div className={classes.section}>
        <Text size={400} weight="semibold">Account</Text>
        <RHFInput
          name="username"
          control={control}
          errors={errors}
          label="Username"
          required
          placeholder="Choose a username"
          contentBefore={<PersonRegular />}
        />
        <RHFInput
          name="email"
          control={control}
          errors={errors}
          label="Email"
          type="email"
          required
          contentBefore={<MailRegular />}
        />
      </div>

      <Divider />

      <div className={classes.section}>
        <Text size={400} weight="semibold">Password</Text>
        <RHFInput
          name="password"
          control={control}
          errors={errors}
          label="Password"
          type="password"
          required
          hint="At least 8 characters with uppercase, lowercase, number, and special character"
          contentBefore={<LockClosedRegular />}
        />
        <RHFInput
          name="confirmPassword"
          control={control}
          errors={errors}
          label="Confirm password"
          type="password"
          required
          contentBefore={<LockClosedRegular />}
        />
      </div>

      <Divider />

      <div className={classes.section}>
        <Text size={400} weight="semibold">Profile</Text>
        <RHFRadioGroup
          name="role"
          control={control}
          errors={errors}
          label="Role"
          required
          options={[
            { value: "viewer", label: "Viewer" },
            { value: "editor", label: "Editor" },
            { value: "admin", label: "Administrator" },
          ]}
        />
        <RHFDropdown
          name="department"
          control={control}
          errors={errors}
          label="Department"
          required
          placeholder="Select department"
          options={[
            { value: "engineering", label: "Engineering" },
            { value: "design", label: "Design" },
            { value: "marketing", label: "Marketing" },
            { value: "sales", label: "Sales" },
            { value: "hr", label: "Human Resources" },
          ]}
        />
        <RHFTextarea
          name="bio"
          control={control}
          errors={errors}
          label="Bio"
          placeholder="Tell us about yourself..."
          hint="Up to 500 characters"
        />
      </div>

      <Divider />

      <div className={classes.section}>
        <Text size={400} weight="semibold">Notifications</Text>
        <RHFCheckbox name="notifications.email" control={control} errors={errors} label="Email notifications" />
        <RHFCheckbox name="notifications.push" control={control} errors={errors} label="Push notifications" />
        <RHFCheckbox name="notifications.sms" control={control} errors={errors} label="SMS notifications" />
      </div>

      <Divider />

      <RHFCheckbox
        name="acceptTerms"
        control={control}
        errors={errors}
        label="I accept the terms of service and privacy policy"
        required
      />

      <div className={classes.actions}>
        <Button appearance="secondary" type="button" onClick={() => reset()}>
          Reset
        </Button>
        <Button
          appearance="primary"
          type="submit"
          disabled={isSubmitting}
          icon={<PersonAddRegular />}
          iconPosition="after"
        >
          {isSubmitting ? "Creating..." : "Create Account"}
        </Button>
      </div>
    </form>
  );
};
```

---

## Multi-Step Wizard Complete Implementation

### Step 1: Wizard Shell with Progress

```tsx
import React, { useState, useCallback, useMemo } from "react";
import {
  Button,
  ProgressBar,
  Text,
  Card,
  CardHeader,
  Badge,
  makeStyles,
  tokens,
  mergeClasses,
} from "@fluentui/react-components";
import {
  ArrowLeftRegular,
  ArrowRightRegular,
  CheckmarkRegular,
} from "@fluentui/react-icons";

// --- Types ---

export interface WizardStepConfig {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<WizardStepProps>;
  validate?: (data: WizardFormData) => Promise<string[]> | string[];
  optional?: boolean;
}

export interface WizardStepProps {
  data: WizardFormData;
  errors: Record<string, string>;
  onUpdate: (field: string, value: unknown) => void;
  onBatchUpdate: (updates: Record<string, unknown>) => void;
}

export type WizardFormData = Record<string, unknown>;

// --- Styles ---

const useStyles = makeStyles({
  container: {
    maxWidth: "680px",
    margin: "0 auto",
  },
  stepper: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    marginBottom: tokens.spacingVerticalL,
  },
  stepIndicator: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  stepDot: {
    width: "32px",
    height: "32px",
    borderRadius: tokens.borderRadiusCircular,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    border: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  stepDotActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    border: `2px solid ${tokens.colorBrandStroke1}`,
  },
  stepDotComplete: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    border: `2px solid ${tokens.colorPaletteGreenBorder2}`,
  },
  stepConnector: {
    flex: 1,
    height: "2px",
    backgroundColor: tokens.colorNeutralStroke1,
    alignSelf: "center",
    minWidth: "24px",
  },
  stepConnectorComplete: {
    backgroundColor: tokens.colorPaletteGreenBorder2,
  },
  content: {
    padding: tokens.spacingVerticalL,
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: tokens.spacingVerticalXL,
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  errorList: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalS + " " + tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
    listStyleType: "none",
  },
});

// --- Wizard Component ---

interface WizardProps {
  steps: WizardStepConfig[];
  onComplete: (data: WizardFormData) => void | Promise<void>;
  initialData?: WizardFormData;
}

export const FormWizard: React.FC<WizardProps> = ({
  steps,
  onComplete,
  initialData = {},
}) => {
  const classes = useStyles();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(initialData);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on update
    setStepErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleBatchUpdate = useCallback((updates: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const validateCurrentStep = async (): Promise<boolean> => {
    const step = steps[currentStep];
    if (!step.validate) return true;

    const errors = await step.validate(formData);
    if (errors.length === 0) {
      setStepErrors({});
      return true;
    }

    // Convert error strings to a record (field:message pairs or index-based)
    const errorMap: Record<string, string> = {};
    errors.forEach((err, i) => {
      const [field, ...msgParts] = err.split(": ");
      if (msgParts.length > 0) {
        errorMap[field] = msgParts.join(": ");
      } else {
        errorMap[`_error_${i}`] = err;
      }
    });
    setStepErrors(errorMap);
    return false;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
      setStepErrors({});
    } else {
      setIsSubmitting(true);
      try {
        await onComplete(formData);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
    setStepErrors({});
  };

  const handleStepClick = (index: number) => {
    // Allow navigating to completed steps or current step - 1
    if (completedSteps.has(index) || index === currentStep - 1) {
      setCurrentStep(index);
      setStepErrors({});
    }
  };

  const CurrentComponent = steps[currentStep].component;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Card className={classes.container}>
      {/* Step Indicator */}
      <div className={classes.stepper} role="navigation" aria-label="Form steps">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={classes.stepIndicator}>
              <button
                className={mergeClasses(
                  classes.stepDot,
                  index === currentStep && classes.stepDotActive,
                  completedSteps.has(index) && classes.stepDotComplete
                )}
                onClick={() => handleStepClick(index)}
                disabled={!completedSteps.has(index) && index !== currentStep}
                aria-label={`Step ${index + 1}: ${step.title}${
                  completedSteps.has(index) ? " (completed)" : ""
                }${index === currentStep ? " (current)" : ""}`}
                aria-current={index === currentStep ? "step" : undefined}
              >
                {completedSteps.has(index) ? (
                  <CheckmarkRegular fontSize={16} />
                ) : (
                  index + 1
                )}
              </button>
              <Text
                size={200}
                weight={index === currentStep ? "semibold" : "regular"}
              >
                {step.title}
              </Text>
            </div>
            {index < steps.length - 1 && (
              <div
                className={mergeClasses(
                  classes.stepConnector,
                  completedSteps.has(index) && classes.stepConnectorComplete
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Header */}
      <CardHeader
        header={
          <Text weight="semibold" size={500}>
            {steps[currentStep].title}
          </Text>
        }
        description={
          steps[currentStep].description && (
            <Text size={300}>{steps[currentStep].description}</Text>
          )
        }
      />

      {/* Error Display */}
      {Object.keys(stepErrors).length > 0 && (
        <ul className={classes.errorList} role="alert" aria-live="assertive">
          {Object.values(stepErrors).map((error, i) => (
            <li key={i}>
              <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                {error}
              </Text>
            </li>
          ))}
        </ul>
      )}

      {/* Step Content */}
      <div className={classes.content}>
        <CurrentComponent
          data={formData}
          errors={stepErrors}
          onUpdate={handleUpdate}
          onBatchUpdate={handleBatchUpdate}
        />
      </div>

      {/* Navigation */}
      <div className={classes.navigation}>
        <Button
          appearance="secondary"
          icon={<ArrowLeftRegular />}
          disabled={currentStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <div style={{ display: "flex", gap: tokens.spacingHorizontalS }}>
          {steps[currentStep].optional && !isLastStep && (
            <Button
              appearance="subtle"
              onClick={() => {
                setCompletedSteps((prev) => new Set([...prev, currentStep]));
                setCurrentStep((s) => s + 1);
              }}
            >
              Skip
            </Button>
          )}
          <Button
            appearance="primary"
            icon={isLastStep ? <CheckmarkRegular /> : <ArrowRightRegular />}
            iconPosition="after"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isLastStep
              ? isSubmitting
                ? "Submitting..."
                : "Submit"
              : "Next"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
```

### Step 2: Individual Step Components

```tsx
import { Field, Input, Textarea, Dropdown, Option } from "@fluentui/react-components";
import { WizardStepProps } from "./FormWizard";

// --- Step 1: Personal Info ---
export const PersonalInfoStep: React.FC<WizardStepProps> = ({
  data,
  errors,
  onUpdate,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    <Field
      label="First name"
      required
      validationState={errors.firstName ? "error" : "none"}
      validationMessage={errors.firstName}
    >
      <Input
        value={(data.firstName as string) ?? ""}
        onChange={(_, d) => onUpdate("firstName", d.value)}
      />
    </Field>
    <Field
      label="Last name"
      required
      validationState={errors.lastName ? "error" : "none"}
      validationMessage={errors.lastName}
    >
      <Input
        value={(data.lastName as string) ?? ""}
        onChange={(_, d) => onUpdate("lastName", d.value)}
      />
    </Field>
    <Field
      label="Email"
      required
      validationState={errors.email ? "error" : "none"}
      validationMessage={errors.email}
    >
      <Input
        type="email"
        value={(data.email as string) ?? ""}
        onChange={(_, d) => onUpdate("email", d.value)}
      />
    </Field>
  </div>
);

// --- Step 2: Company Info ---
export const CompanyInfoStep: React.FC<WizardStepProps> = ({
  data,
  errors,
  onUpdate,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    <Field
      label="Company name"
      required
      validationState={errors.company ? "error" : "none"}
      validationMessage={errors.company}
    >
      <Input
        value={(data.company as string) ?? ""}
        onChange={(_, d) => onUpdate("company", d.value)}
      />
    </Field>
    <Field label="Role">
      <Dropdown
        value={(data.role as string) ?? ""}
        onOptionSelect={(_, d) => onUpdate("role", d.optionValue)}
        placeholder="Select role"
      >
        <Option value="developer">Developer</Option>
        <Option value="designer">Designer</Option>
        <Option value="manager">Manager</Option>
        <Option value="executive">Executive</Option>
      </Dropdown>
    </Field>
    <Field label="Additional notes">
      <Textarea
        value={(data.notes as string) ?? ""}
        onChange={(_, d) => onUpdate("notes", d.value)}
        rows={3}
      />
    </Field>
  </div>
);

// --- Step 3: Confirmation ---
export const ConfirmationStep: React.FC<WizardStepProps> = ({ data }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <Text weight="semibold">Please review your information:</Text>
    <Text>Name: {data.firstName as string} {data.lastName as string}</Text>
    <Text>Email: {data.email as string}</Text>
    <Text>Company: {data.company as string}</Text>
    <Text>Role: {data.role as string}</Text>
    {data.notes && <Text>Notes: {data.notes as string}</Text>}
  </div>
);
```

### Step 3: Wire It Up

```tsx
import { FormWizard, WizardStepConfig } from "./FormWizard";
import { PersonalInfoStep, CompanyInfoStep, ConfirmationStep } from "./WizardSteps";

const steps: WizardStepConfig[] = [
  {
    id: "personal",
    title: "Personal Info",
    description: "Tell us about yourself",
    component: PersonalInfoStep,
    validate: (data) => {
      const errors: string[] = [];
      if (!data.firstName) errors.push("firstName: First name is required");
      if (!data.lastName) errors.push("lastName: Last name is required");
      if (!data.email) errors.push("email: Email is required");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email as string)) {
        errors.push("email: Please enter a valid email");
      }
      return errors;
    },
  },
  {
    id: "company",
    title: "Company",
    description: "Tell us about your organization",
    component: CompanyInfoStep,
    validate: (data) => {
      const errors: string[] = [];
      if (!data.company) errors.push("company: Company name is required");
      return errors;
    },
  },
  {
    id: "confirm",
    title: "Confirm",
    description: "Review and submit",
    component: ConfirmationStep,
  },
];

export const OnboardingWizard: React.FC = () => (
  <FormWizard
    steps={steps}
    onComplete={async (data) => {
      await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }}
  />
);
```

---

## Form Layout Patterns

### Single-Column Layout (default)

Best for mobile-first forms and simple data entry:

```tsx
const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "480px",
  },
});
```

### Two-Column Layout

For wider forms with related field pairs (name, city/state):

```tsx
const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "720px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalM,
    "@media (max-width: 600px)": {
      gridTemplateColumns: "1fr",
    },
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
});

// Usage:
<form className={classes.form}>
  <div className={classes.row}>
    <Field label="First name"><Input /></Field>
    <Field label="Last name"><Input /></Field>
  </div>
  <div className={classes.row}>
    <Field label="City"><Input /></Field>
    <Field label="State"><Select>...</Select></Field>
  </div>
  <div className={classes.fullWidth}>
    <Field label="Address"><Input /></Field>
  </div>
</form>
```

### Horizontal (Settings) Layout

Label beside input — useful for settings and preferences:

```tsx
const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "720px",
  },
});

<form className={classes.form}>
  <Field label="Display name" orientation="horizontal">
    <Input />
  </Field>
  <Field label="Email" orientation="horizontal">
    <Input type="email" />
  </Field>
  <Field label="Timezone" orientation="horizontal">
    <Dropdown>...</Dropdown>
  </Field>
</form>
```

### Inline Layout

Fields in a row — useful for filter bars and compact forms:

```tsx
const useStyles = makeStyles({
  inline: {
    display: "flex",
    alignItems: "flex-end",
    gap: tokens.spacingHorizontalM,
    flexWrap: "wrap",
  },
});

<div className={classes.inline}>
  <Field label="Search">
    <Input contentBefore={<SearchRegular />} />
  </Field>
  <Field label="Category">
    <Dropdown>...</Dropdown>
  </Field>
  <Button appearance="primary">Apply</Button>
</div>
```

---

## Validation Pattern Library

### Email Validation

```tsx
// Yup
email: Yup.string()
  .email("Please enter a valid email address")
  .required("Email is required")

// Zod
email: z.string()
  .email("Please enter a valid email address")

// Custom domain restriction
email: z.string()
  .email("Invalid email")
  .refine(
    (val) => val.endsWith("@company.com"),
    "Must use a company email address"
  )
```

### Phone Number Validation

```tsx
// Yup
phone: Yup.string()
  .matches(
    /^(\+?\d{1,3}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?[\d\-.\s]{6,}$/,
    "Please enter a valid phone number"
  )

// Zod
phone: z.string()
  .regex(
    /^(\+?\d{1,3}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?[\d\-.\s]{6,}$/,
    "Please enter a valid phone number"
  )
  .or(z.literal(""))  // Allow empty for optional fields
```

### Password Validation

```tsx
// Yup
password: Yup.string()
  .min(8, "Must be at least 8 characters")
  .matches(/[A-Z]/, "Must contain an uppercase letter")
  .matches(/[a-z]/, "Must contain a lowercase letter")
  .matches(/[0-9]/, "Must contain a number")
  .matches(/[^A-Za-z0-9]/, "Must contain a special character")
  .required("Password is required"),
confirmPassword: Yup.string()
  .oneOf([Yup.ref("password")], "Passwords must match")
  .required("Please confirm your password")

// Zod (with refine for cross-field)
const schema = z.object({
  password: z.string()
    .min(8, "Must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

### URL Validation

```tsx
// Yup
website: Yup.string()
  .url("Please enter a valid URL")
  .optional()

// Zod
website: z.string()
  .url("Please enter a valid URL")
  .or(z.literal(""))
  .optional()
```

### Custom Async Validation (Username Availability)

```tsx
// Yup
username: Yup.string()
  .min(3, "Must be at least 3 characters")
  .test("unique", "Username is already taken", async (value) => {
    if (!value || value.length < 3) return true;  // Skip if too short
    const response = await fetch(`/api/check-username?q=${value}`);
    const { available } = await response.json();
    return available;
  })
  .required("Username is required")

// Zod (with superRefine for async in RHF)
// Note: Zod schemas are synchronous by default.
// Use RHF's async validate option instead:
const { control, setError } = useForm({
  resolver: zodResolver(baseSchema),
});

// Debounced async check in the component:
const checkUsername = useDebouncedCallback(async (username: string) => {
  const response = await fetch(`/api/check-username?q=${username}`);
  const { available } = await response.json();
  if (!available) {
    setError("username", { message: "Username is already taken" });
  }
}, 500);
```

### Conditional Validation

```tsx
// Yup — validate phone only when preferred contact is "phone"
phone: Yup.string().when("preferredContact", {
  is: "phone",
  then: (schema) => schema.required("Phone is required when phone contact is selected"),
  otherwise: (schema) => schema.optional(),
})

// Zod — conditional with discriminated union
const schema = z.discriminatedUnion("contactMethod", [
  z.object({
    contactMethod: z.literal("email"),
    email: z.string().email("Invalid email"),
  }),
  z.object({
    contactMethod: z.literal("phone"),
    phone: z.string().regex(/^\+?[\d\s-]{10,}$/, "Invalid phone"),
  }),
]);
```

### Number Range Validation

```tsx
// Yup
quantity: Yup.number()
  .typeError("Must be a number")
  .integer("Must be a whole number")
  .min(1, "Minimum quantity is 1")
  .max(9999, "Maximum quantity is 9999")
  .required("Quantity is required")

// Zod
quantity: z.coerce
  .number({ invalid_type_error: "Must be a number" })
  .int("Must be a whole number")
  .min(1, "Minimum quantity is 1")
  .max(9999, "Maximum quantity is 9999")
```

### Date Validation

```tsx
// Yup
startDate: Yup.date()
  .min(new Date(), "Start date must be in the future")
  .required("Start date is required"),
endDate: Yup.date()
  .min(Yup.ref("startDate"), "End date must be after start date")
  .required("End date is required")

// Zod
startDate: z.coerce.date().min(new Date(), "Must be in the future"),
endDate: z.coerce.date(),
// Then refine at object level:
.refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
})
```

---

## Controlled vs Uncontrolled Form Components

### Controlled (Recommended)

The component value is managed by React state. This is the standard approach for Fluent components:

```tsx
const [name, setName] = useState("");

<Input
  value={name}
  onChange={(_, data) => setName(data.value)}
/>
```

**When to use:** Almost always. Controlled is required when using Formik, React Hook Form,
or any state management that needs to read/write form values.

### Uncontrolled with defaultValue

The component manages its own state internally. Use `defaultValue` for initial state
and `ref` to read the current value:

```tsx
const inputRef = useRef<HTMLInputElement>(null);

<Input
  defaultValue="initial text"
  ref={inputRef}
/>

// Read value on submit:
const handleSubmit = () => {
  const currentValue = inputRef.current?.value;
};
```

**When to use:** Simple forms where you only need the value on submit, performance-critical
forms with many fields (avoids re-renders on every keystroke).

### Uncontrolled with React Hook Form register

RHF can work in uncontrolled mode with `register` for native inputs, but Fluent components
need `Controller` because they use custom `onChange` signatures:

```tsx
// This does NOT work with Fluent Input:
<Input {...register("name")} />  // Wrong — onChange shape mismatch

// Use Controller instead:
<Controller
  name="name"
  control={control}
  render={({ field }) => (
    <Input
      value={field.value}
      onChange={(_, data) => field.onChange(data.value)}
      onBlur={field.onBlur}
      ref={field.ref}
    />
  )}
/>
```

---

## Form State Management Approaches

### Approach 1: React useState (Simple Forms)

Best for forms with fewer than 5 fields and no complex validation:

```tsx
const [formData, setFormData] = useState({
  name: "",
  email: "",
});

const handleChange = (field: string) => (_: unknown, data: { value: string }) => {
  setFormData((prev) => ({ ...prev, [field]: data.value }));
};

<Field label="Name">
  <Input value={formData.name} onChange={handleChange("name")} />
</Field>
```

### Approach 2: React useReducer (Medium Complexity)

Better type safety and predictable state transitions:

```tsx
type FormState = {
  values: { name: string; email: string; role: string };
  errors: Record<string, string>;
  touched: Record<string, boolean>;
};

type FormAction =
  | { type: "SET_VALUE"; field: string; value: string }
  | { type: "SET_ERROR"; field: string; error: string }
  | { type: "SET_TOUCHED"; field: string }
  | { type: "RESET" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_VALUE":
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: "" },
      };
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };
    case "SET_TOUCHED":
      return {
        ...state,
        touched: { ...state.touched, [action.field]: true },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}
```

### Approach 3: Formik (Full-Featured, Established)

Best when you want a battle-tested library with Yup integration:

- Declarative validation with Yup schemas
- Built-in touched/dirty tracking
- Array fields with `FieldArray`
- Form-level and field-level validation
- `isSubmitting`, `isValid`, `dirty` computed states

**Trade-off:** Larger bundle, uses internal state (not external store-compatible).

### Approach 4: React Hook Form (Performance-Focused)

Best for large forms where re-render performance matters:

- Uncontrolled by default (fewer re-renders)
- Tiny bundle (~8.5kB gzipped)
- DevTools for debugging
- `watch` for selective re-renders
- `useFieldArray` for dynamic fields
- Works with any schema library via resolvers

**Trade-off:** Needs `Controller` for Fluent components (controlled wrapper adds slight complexity).

### Approach 5: Zustand / Jotai (External State)

For forms whose data is shared across multiple components or pages:

```tsx
import { create } from "zustand";

interface FormStore {
  values: Record<string, unknown>;
  setValue: (field: string, value: unknown) => void;
  reset: () => void;
}

const useFormStore = create<FormStore>((set) => ({
  values: {},
  setValue: (field, value) =>
    set((state) => ({ values: { ...state.values, [field]: value } })),
  reset: () => set({ values: {} }),
}));
```

**Trade-off:** You must build validation, touched tracking, and error display yourself.

### Decision Matrix

| Approach | Fields | Validation | Re-renders | Bundle | Best For |
|---|---|---|---|---|---|
| useState | < 5 | Manual | Every change | 0 | Simple forms |
| useReducer | 5-10 | Manual | Every change | 0 | Medium forms |
| Formik | Any | Yup built-in | Every change | ~33kB | Feature-rich forms |
| React Hook Form | Any | Any resolver | Minimal | ~8.5kB | Performance-critical |
| Zustand/Jotai | Any | Manual | Selective | ~2kB | Cross-component state |
