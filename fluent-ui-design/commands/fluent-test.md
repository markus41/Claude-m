---
name: fluent-ui-design:test
description: Generate tests for Fluent UI components — render tests, accessibility audits, theme switching, and interaction testing.
argument-hint: "<component-path> [--a11y] [--themes] [--interactions]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Generate Tests for Fluent UI Components

Create comprehensive test suites for Fluent UI React v9 components including render tests, accessibility audits, theme switching coverage, and user interaction tests.

## Arguments

- `<component-path>` — Path to the component file to test (required)
- `--a11y` — Include axe-core accessibility tests
- `--themes` — Include theme switching tests (light, dark, high contrast)
- `--interactions` — Include user-event interaction tests

If no flags are provided, generate only the base render test. If the component path is a directory, test all `.tsx` component files in that directory.

## Workflow

### Step 1: Read the Target Component

1. Read the component file at `<component-path>`.
2. Analyze the component to determine:
   - Component name and whether it is a default or named export
   - Props interface (required and optional props)
   - Which Fluent UI components are used (Button, Input, Dialog, etc.)
   - Event handlers (onClick, onChange, onSubmit, etc.)
   - State management (useState, useReducer, context)
   - Conditional rendering branches
   - Whether it uses `makeStyles` or inline styles
3. Check for an existing test file next to the component:
   - `ComponentName.test.tsx`
   - `__tests__/ComponentName.test.tsx`

### Step 2: Generate Render Test with FluentProvider Wrapper

1. Determine the test file location: place it next to the component as `<ComponentName>.test.tsx`.

2. Check `package.json` for the test runner and install missing dependencies:
   - If using Jest (default):
     ```bash
     npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
     ```
   - If using Vitest:
     ```bash
     npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
     ```

3. Generate the base test file with a FluentProvider wrapper utility:

   ```tsx
   import { render, type RenderOptions } from "@testing-library/react";
   import { FluentProvider, webLightTheme } from "@fluentui/react-components";
   import type { Theme } from "@fluentui/react-components";

   function renderWithFluent(
     ui: React.ReactElement,
     theme: Theme = webLightTheme,
     options?: Omit<RenderOptions, "wrapper">
   ) {
     return render(ui, {
       wrapper: ({ children }) => (
         <FluentProvider theme={theme}>{children}</FluentProvider>
       ),
       ...options,
     });
   }
   ```

4. Generate test cases:
   - **Renders without crashing**: Render the component with required props inside FluentProvider.
   - **Renders expected content**: Assert that key text, labels, or headings are present.
   - **Matches snapshot** (optional): Only if the project already uses snapshot testing.
   - **Handles missing optional props**: Render with only required props, verify no errors.
   - **Conditional rendering**: For each conditional branch, test both states.

### Step 3: If `--a11y` — Add axe-core Accessibility Tests

1. Install axe-core testing utilities if not present:
   ```bash
   npm install --save-dev jest-axe @types/jest-axe
   ```
   Or for Vitest:
   ```bash
   npm install --save-dev vitest-axe
   ```

2. Add accessibility test cases:

   ```tsx
   import { axe, toHaveNoViolations } from "jest-axe";

   expect.extend(toHaveNoViolations);

   describe("Accessibility", () => {
     it("has no axe violations", async () => {
       const { container } = renderWithFluent(<MyComponent {...requiredProps} />);
       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });

     it("has no axe violations in disabled state", async () => {
       const { container } = renderWithFluent(<MyComponent {...requiredProps} disabled />);
       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });

     it("has no axe violations with error state", async () => {
       const { container } = renderWithFluent(<MyComponent {...requiredProps} error="Validation failed" />);
       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });
   });
   ```

3. Add manual accessibility checks:
   - Verify ARIA labels are present on interactive elements
   - Verify focus management for dialogs and modals
   - Verify keyboard navigation order
   - Check that error messages are associated with their inputs via `aria-describedby`

### Step 4: If `--themes` — Add Theme Switching Tests

1. Generate tests that render the component under each supported theme:

   ```tsx
   import { webLightTheme, webDarkTheme, teamsLightTheme, teamsDarkTheme, teamsHighContrastTheme } from "@fluentui/react-components";

   const themes = [
     { name: "Web Light", theme: webLightTheme },
     { name: "Web Dark", theme: webDarkTheme },
     { name: "Teams Light", theme: teamsLightTheme },
     { name: "Teams Dark", theme: teamsDarkTheme },
     { name: "Teams High Contrast", theme: teamsHighContrastTheme },
   ];

   describe("Theme compatibility", () => {
     themes.forEach(({ name, theme }) => {
       it(`renders correctly in ${name} theme`, () => {
         const { container } = renderWithFluent(<MyComponent {...requiredProps} />, theme);
         expect(container).toBeTruthy();
         // Verify the component renders visible content
         expect(container.textContent).toBeTruthy();
       });
     });

     it("updates when theme changes", () => {
       const { rerender, container } = renderWithFluent(<MyComponent {...requiredProps} />, webLightTheme);
       // Re-render with a different theme
       rerender(
         <FluentProvider theme={webDarkTheme}>
           <MyComponent {...requiredProps} />
         </FluentProvider>
       );
       expect(container).toBeTruthy();
     });
   });
   ```

2. If the component uses `tokens` from `@fluentui/react-components` in inline styles, add a test verifying that token values resolve (no undefined values in computed styles).

3. If `--a11y` is also specified, run axe checks under high contrast theme to catch contrast-dependent accessibility issues.

### Step 5: If `--interactions` — Add User-Event Interaction Tests

1. Import `@testing-library/user-event`:

   ```tsx
   import userEvent from "@testing-library/user-event";
   ```

2. Generate interaction tests based on the component's event handlers:

   **Button clicks:**
   ```tsx
   it("calls onClick when button is clicked", async () => {
     const user = userEvent.setup();
     const handleClick = jest.fn();
     const { getByRole } = renderWithFluent(<MyComponent onClick={handleClick} />);
     await user.click(getByRole("button", { name: /submit/i }));
     expect(handleClick).toHaveBeenCalledTimes(1);
   });
   ```

   **Text input:**
   ```tsx
   it("updates input value on typing", async () => {
     const user = userEvent.setup();
     const handleChange = jest.fn();
     const { getByRole } = renderWithFluent(<MyComponent onChange={handleChange} />);
     const input = getByRole("textbox");
     await user.type(input, "Hello");
     expect(handleChange).toHaveBeenCalled();
   });
   ```

   **Select / Dropdown:**
   ```tsx
   it("selects an option from dropdown", async () => {
     const user = userEvent.setup();
     const handleSelect = jest.fn();
     const { getByRole } = renderWithFluent(<MyComponent onOptionSelect={handleSelect} />);
     await user.click(getByRole("combobox"));
     await user.click(getByRole("option", { name: /option 1/i }));
     expect(handleSelect).toHaveBeenCalled();
   });
   ```

   **Dialog open/close:**
   ```tsx
   it("opens dialog on trigger click", async () => {
     const user = userEvent.setup();
     const { getByRole, queryByRole } = renderWithFluent(<MyComponent />);
     expect(queryByRole("dialog")).not.toBeInTheDocument();
     await user.click(getByRole("button", { name: /open/i }));
     expect(getByRole("dialog")).toBeInTheDocument();
   });
   ```

   **Form submission:**
   ```tsx
   it("submits form with entered data", async () => {
     const user = userEvent.setup();
     const handleSubmit = jest.fn();
     const { getByRole, getByLabelText } = renderWithFluent(<MyComponent onSubmit={handleSubmit} />);
     await user.type(getByLabelText(/name/i), "John");
     await user.type(getByLabelText(/email/i), "john@example.com");
     await user.click(getByRole("button", { name: /submit/i }));
     expect(handleSubmit).toHaveBeenCalledWith(
       expect.objectContaining({ name: "John", email: "john@example.com" })
     );
   });
   ```

   **Keyboard navigation:**
   ```tsx
   it("supports keyboard navigation", async () => {
     const user = userEvent.setup();
     const { getByRole } = renderWithFluent(<MyComponent />);
     await user.tab();
     expect(getByRole("button", { name: /first/i })).toHaveFocus();
     await user.tab();
     expect(getByRole("button", { name: /second/i })).toHaveFocus();
   });
   ```

3. For components with loading states, test the loading indicator appearance and that controls are disabled during loading.

4. For components with error states, test that error messages appear and are associated with the correct form fields.

### Step 6: Output Test File

1. Write the generated test file next to the component:
   - `src/components/MyComponent.tsx` produces `src/components/MyComponent.test.tsx`

2. Verify the test file compiles:
   ```bash
   npx tsc --noEmit src/components/MyComponent.test.tsx
   ```

3. Run the tests:
   ```bash
   npx jest src/components/MyComponent.test.tsx --no-coverage
   ```
   Or for Vitest:
   ```bash
   npx vitest run src/components/MyComponent.test.tsx
   ```

## Output

Report to the developer:
- Test file path
- Number of test cases generated, broken down by category:
  - Render tests: N
  - Accessibility tests: N (if `--a11y`)
  - Theme tests: N (if `--themes`)
  - Interaction tests: N (if `--interactions`)
- Any dependencies installed
- Test execution results (pass/fail)
- Recommendations:
  - Additional test cases to consider manually
  - Edge cases not covered by generation
  - Integration testing suggestions for Office.js or other external APIs
