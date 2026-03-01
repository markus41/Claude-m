# PCF Control Scaffolding Examples

## Example 1: Star Rating Field Control

A field control bound to a `Whole.None` (integer) column that displays interactive star icons.

### ControlManifest.Input.xml

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control
    namespace="Contoso"
    constructor="StarRating"
    version="1.0.0"
    display-name-key="StarRating_Display"
    description-key="StarRating_Desc"
    control-type="standard"
  >
    <!-- Bound property: the rating value (integer 0–N) -->
    <property
      name="ratingValue"
      display-name-key="Rating_Value"
      description-key="The current rating value"
      of-type="Whole.None"
      usage="bound"
      required="true"
    />

    <!-- Input property: maximum number of stars -->
    <property
      name="maxStars"
      display-name-key="Max_Stars"
      description-key="Maximum number of stars to display (1-10)"
      of-type="Whole.None"
      usage="input"
      required="false"
      default-value="5"
    />

    <!-- Input property: filled star color -->
    <property
      name="starColor"
      display-name-key="Star_Color"
      description-key="CSS color for filled stars"
      of-type="SingleLine.Text"
      usage="input"
      required="false"
      default-value="#FFD700"
    />

    <!-- Input property: empty star color -->
    <property
      name="emptyColor"
      display-name-key="Empty_Color"
      description-key="CSS color for empty stars"
      of-type="SingleLine.Text"
      usage="input"
      required="false"
      default-value="#E0E0E0"
    />

    <resources>
      <code path="index.ts" order="1" />
      <css path="css/StarRating.css" order="1" />
    </resources>

    <feature-usage>
      <uses-feature name="utility" required="true" />
    </feature-usage>
  </control>
</manifest>
```

### index.ts

```typescript
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class StarRating
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private container: HTMLDivElement;
  private notifyOutputChanged: () => void;
  private currentValue: number;
  private maxStars: number;
  private starColor: string;
  private emptyColor: string;
  private isReadOnly: boolean;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;
    this.container.classList.add("star-rating-container");

    this.readParameters(context);
    this.render();
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.readParameters(context);
    this.render();
  }

  public getOutputs(): IOutputs {
    return {
      ratingValue: this.currentValue,
    };
  }

  public destroy(): void {
    // Clean up — remove event listeners via innerHTML clear
    this.container.innerHTML = "";
  }

  private readParameters(context: ComponentFramework.Context<IInputs>): void {
    this.currentValue = context.parameters.ratingValue.raw ?? 0;
    this.maxStars = context.parameters.maxStars.raw ?? 5;
    this.starColor = context.parameters.starColor.raw ?? "#FFD700";
    this.emptyColor = context.parameters.emptyColor.raw ?? "#E0E0E0";
    this.isReadOnly = context.mode.isControlDisabled;
  }

  private render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "star-rating-wrapper";
    wrapper.setAttribute("role", "radiogroup");
    wrapper.setAttribute("aria-label", `Rating: ${this.currentValue} of ${this.maxStars}`);

    for (let i = 1; i <= this.maxStars; i++) {
      const star = document.createElement("span");
      star.className = "star-rating-star";
      star.setAttribute("role", "radio");
      star.setAttribute("aria-checked", i <= this.currentValue ? "true" : "false");
      star.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
      star.setAttribute("tabindex", this.isReadOnly ? "-1" : "0");
      star.textContent = "\u2605"; // ★ character
      star.style.color = i <= this.currentValue ? this.starColor : this.emptyColor;
      star.style.cursor = this.isReadOnly ? "default" : "pointer";

      if (!this.isReadOnly) {
        const rating = i;
        star.addEventListener("click", () => this.setRating(rating));
        star.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.setRating(rating);
          }
        });
        star.addEventListener("mouseenter", () => this.highlightStars(rating));
        star.addEventListener("mouseleave", () => this.render());
      }

      wrapper.appendChild(star);
    }

    // Clear button
    if (!this.isReadOnly && this.currentValue > 0) {
      const clearBtn = document.createElement("button");
      clearBtn.className = "star-rating-clear";
      clearBtn.textContent = "Clear";
      clearBtn.setAttribute("aria-label", "Clear rating");
      clearBtn.addEventListener("click", () => this.setRating(0));
      wrapper.appendChild(clearBtn);
    }

    this.container.appendChild(wrapper);
  }

  private setRating(value: number): void {
    this.currentValue = value;
    this.notifyOutputChanged();
    this.render();
  }

  private highlightStars(upTo: number): void {
    const stars = this.container.querySelectorAll(".star-rating-star");
    stars.forEach((star, index) => {
      (star as HTMLElement).style.color =
        index < upTo ? this.starColor : this.emptyColor;
    });
  }
}
```

### css/StarRating.css

```css
.star-rating-container {
  display: inline-block;
  font-family: inherit;
}

.star-rating-wrapper {
  display: flex;
  align-items: center;
  gap: 2px;
}

.star-rating-star {
  font-size: 24px;
  line-height: 1;
  transition: color 0.15s ease, transform 0.1s ease;
  user-select: none;
  outline: none;
}

.star-rating-star:hover {
  transform: scale(1.2);
}

.star-rating-star:focus-visible {
  outline: 2px solid #0078d4;
  outline-offset: 2px;
  border-radius: 2px;
}

.star-rating-clear {
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: #666;
}

.star-rating-clear:hover {
  background: #f0f0f0;
  border-color: #999;
}
```

---

## Example 2: Card Gallery Dataset Control

A dataset control that renders records as cards with title, description, and image.

### ControlManifest.Input.xml

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control
    namespace="Contoso"
    constructor="CardGallery"
    version="1.0.0"
    display-name-key="CardGallery_Display"
    description-key="CardGallery_Desc"
    control-type="standard"
  >
    <data-set
      name="records"
      display-name-key="Records"
      cds-data-set-options="displayCommandBar:true;displayViewSelector:true;displayQuickFind:true"
    >
      <property-set
        name="title"
        display-name-key="Title"
        description-key="Column to use as card title"
        of-type="SingleLine.Text"
        usage="bound"
        required="true"
      />
      <property-set
        name="description"
        display-name-key="Description"
        description-key="Column to use as card description"
        of-type="Multiple"
        usage="bound"
        required="false"
      />
      <property-set
        name="status"
        display-name-key="Status"
        description-key="Column to use as card status badge"
        of-type="SingleLine.Text"
        usage="bound"
        required="false"
      />
    </data-set>

    <!-- Input: number of columns in the grid -->
    <property
      name="columns"
      display-name-key="Columns"
      description-key="Number of columns in the card grid"
      of-type="Whole.None"
      usage="input"
      required="false"
      default-value="3"
    />

    <resources>
      <code path="index.ts" order="1" />
      <css path="css/CardGallery.css" order="1" />
    </resources>

    <feature-usage>
      <uses-feature name="utility" required="true" />
    </feature-usage>
  </control>
</manifest>
```

### index.ts

```typescript
import { IInputs, IOutputs } from "./generated/ManifestTypes";

interface CardData {
  id: string;
  title: string;
  description: string;
  status: string;
}

export class CardGallery
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private container: HTMLDivElement;
  private context: ComponentFramework.Context<IInputs>;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.context = context;
    this.container.classList.add("card-gallery-root");
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    const dataset = context.parameters.records;

    // Show loading state
    if (dataset.loading) {
      this.renderLoading();
      return;
    }

    // Extract card data from dataset
    const cards = this.extractCards(dataset);
    const columns = context.parameters.columns.raw ?? 3;

    this.renderGallery(cards, columns, dataset);
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.container.innerHTML = "";
  }

  private extractCards(
    dataset: ComponentFramework.PropertyTypes.DataSet
  ): CardData[] {
    return dataset.sortedRecordIds.map((recordId) => {
      const record = dataset.records[recordId];
      return {
        id: recordId,
        title: record.getFormattedValue("title") || "(No Title)",
        description: record.getFormattedValue("description") || "",
        status: record.getFormattedValue("status") || "",
      };
    });
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="card-gallery-loading">
        <div class="card-gallery-spinner"></div>
        <span>Loading records...</span>
      </div>
    `;
  }

  private renderGallery(
    cards: CardData[],
    columns: number,
    dataset: ComponentFramework.PropertyTypes.DataSet
  ): void {
    this.container.innerHTML = "";

    // Header with record count
    const header = document.createElement("div");
    header.className = "card-gallery-header";
    header.textContent = `${dataset.paging.totalResultCount} record${
      dataset.paging.totalResultCount !== 1 ? "s" : ""
    }`;
    this.container.appendChild(header);

    // Card grid
    const grid = document.createElement("div");
    grid.className = "card-gallery-grid";
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    if (cards.length === 0) {
      const empty = document.createElement("div");
      empty.className = "card-gallery-empty";
      empty.textContent = "No records found.";
      grid.appendChild(empty);
    } else {
      cards.forEach((card) => {
        grid.appendChild(this.createCard(card));
      });
    }

    this.container.appendChild(grid);

    // Pagination controls
    this.renderPaging(dataset.paging);
  }

  private createCard(card: CardData): HTMLDivElement {
    const cardEl = document.createElement("div");
    cardEl.className = "card-gallery-card";
    cardEl.setAttribute("role", "article");
    cardEl.setAttribute("aria-label", card.title);
    cardEl.setAttribute("tabindex", "0");

    // Title
    const title = document.createElement("h3");
    title.className = "card-gallery-card-title";
    title.textContent = card.title;
    cardEl.appendChild(title);

    // Status badge
    if (card.status) {
      const badge = document.createElement("span");
      badge.className = "card-gallery-card-badge";
      badge.textContent = card.status;
      cardEl.appendChild(badge);
    }

    // Description
    if (card.description) {
      const desc = document.createElement("p");
      desc.className = "card-gallery-card-desc";
      desc.textContent =
        card.description.length > 150
          ? card.description.substring(0, 150) + "..."
          : card.description;
      cardEl.appendChild(desc);
    }

    // Click to open record
    cardEl.addEventListener("click", () => this.openRecord(card.id));
    cardEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        this.openRecord(card.id);
      }
    });

    return cardEl;
  }

  private openRecord(recordId: string): void {
    const record = this.context.parameters.records.records[recordId];
    const ref = record.getNamedReference();
    if (ref.etn && ref.id) {
      this.context.navigation.openForm({
        entityName: ref.etn,
        entityId: ref.id.guid,
      });
    }
  }

  private renderPaging(
    paging: ComponentFramework.PropertyTypes.DataSet["paging"]
  ): void {
    const pagingEl = document.createElement("div");
    pagingEl.className = "card-gallery-paging";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "card-gallery-paging-btn";
    prevBtn.textContent = "Previous";
    prevBtn.disabled = !paging.hasPreviousPage;
    prevBtn.addEventListener("click", () => paging.loadPreviousPage());
    pagingEl.appendChild(prevBtn);

    // Page info
    const info = document.createElement("span");
    info.className = "card-gallery-paging-info";
    info.textContent = `Page ${Math.ceil(
      (paging.firstPageNumber || 1)
    )} | ${paging.totalResultCount} total`;
    pagingEl.appendChild(info);

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "card-gallery-paging-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = !paging.hasNextPage;
    nextBtn.addEventListener("click", () => paging.loadNextPage());
    pagingEl.appendChild(nextBtn);

    this.container.appendChild(pagingEl);
  }
}
```

### css/CardGallery.css

```css
.card-gallery-root {
  font-family: "Segoe UI", system-ui, sans-serif;
  padding: 12px;
}

.card-gallery-header {
  font-size: 14px;
  color: #605e5c;
  margin-bottom: 12px;
  font-weight: 600;
}

.card-gallery-grid {
  display: grid;
  gap: 16px;
}

.card-gallery-card {
  background: #ffffff;
  border: 1px solid #edebe9;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  outline: none;
}

.card-gallery-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  border-color: #c8c6c4;
}

.card-gallery-card:focus-visible {
  border-color: #0078d4;
  box-shadow: 0 0 0 2px #0078d4;
}

.card-gallery-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #323130;
  margin: 0 0 8px 0;
}

.card-gallery-card-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #e8f0fe;
  color: #0078d4;
  margin-bottom: 8px;
}

.card-gallery-card-desc {
  font-size: 14px;
  color: #605e5c;
  margin: 0;
  line-height: 1.4;
}

.card-gallery-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  color: #605e5c;
}

.card-gallery-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #edebe9;
  border-top-color: #0078d4;
  border-radius: 50%;
  animation: card-gallery-spin 0.8s linear infinite;
}

@keyframes card-gallery-spin {
  to { transform: rotate(360deg); }
}

.card-gallery-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px 24px;
  color: #a19f9d;
  font-size: 14px;
}

.card-gallery-paging {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #edebe9;
}

.card-gallery-paging-btn {
  padding: 6px 16px;
  font-size: 13px;
  border: 1px solid #c8c6c4;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #323130;
}

.card-gallery-paging-btn:hover:not(:disabled) {
  background: #f3f2f1;
}

.card-gallery-paging-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.card-gallery-paging-info {
  font-size: 13px;
  color: #605e5c;
}
```

---

## Example 3: Rich Text Editor React Control

A React-based field control using Fluent UI v9 for a rich text editing experience.

### ControlManifest.Input.xml

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control
    namespace="Contoso"
    constructor="RichTextEditor"
    version="1.0.0"
    display-name-key="RichTextEditor_Display"
    description-key="RichTextEditor_Desc"
    control-type="virtual"
  >
    <!-- Bound property: HTML content -->
    <property
      name="content"
      display-name-key="Content"
      description-key="HTML content of the editor"
      of-type="Multiple"
      usage="bound"
      required="true"
    />

    <!-- Input: placeholder text -->
    <property
      name="placeholder"
      display-name-key="Placeholder"
      description-key="Placeholder text when editor is empty"
      of-type="SingleLine.Text"
      usage="input"
      required="false"
      default-value="Start typing..."
    />

    <!-- Input: minimum height in pixels -->
    <property
      name="minHeight"
      display-name-key="Min_Height"
      description-key="Minimum height of the editor in pixels"
      of-type="Whole.None"
      usage="input"
      required="false"
      default-value="200"
    />

    <resources>
      <code path="index.ts" order="1" />
    </resources>

    <feature-usage>
      <uses-feature name="utility" required="true" />
    </feature-usage>
  </control>
</manifest>
```

### index.ts

```typescript
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { RichTextEditorComponent, IRichTextEditorProps } from "./RichTextEditorComponent";
import * as React from "react";

export class RichTextEditor
  implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
  private notifyOutputChanged: () => void;
  private currentContent: string;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary
  ): void {
    this.notifyOutputChanged = notifyOutputChanged;
    this.currentContent = context.parameters.content.raw ?? "";
  }

  public updateView(
    context: ComponentFramework.Context<IInputs>
  ): React.ReactElement {
    const props: IRichTextEditorProps = {
      content: context.parameters.content.raw ?? "",
      placeholder: context.parameters.placeholder.raw ?? "Start typing...",
      minHeight: context.parameters.minHeight.raw ?? 200,
      isDisabled: context.mode.isControlDisabled,
      onChange: this.handleChange.bind(this),
    };

    return React.createElement(RichTextEditorComponent, props);
  }

  private handleChange(newContent: string): void {
    this.currentContent = newContent;
    this.notifyOutputChanged();
  }

  public getOutputs(): IOutputs {
    return {
      content: this.currentContent,
    };
  }

  public destroy(): void {}
}
```

### RichTextEditorComponent.tsx

```tsx
import * as React from "react";
import {
  FluentProvider,
  webLightTheme,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Textarea,
  makeStyles,
  tokens,
  Tooltip,
  Badge,
} from "@fluentui/react-components";
import {
  TextBoldRegular,
  TextItalicRegular,
  TextUnderlineRegular,
  TextStrikethroughRegular,
  TextNumberListLtrRegular,
  TextBulletListLtrRegular,
  ArrowUndoRegular,
  ArrowRedoRegular,
  CodeRegular,
} from "@fluentui/react-icons";

export interface IRichTextEditorProps {
  content: string;
  placeholder: string;
  minHeight: number;
  isDisabled: boolean;
  onChange: (content: string) => void;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  rootDisabled: {
    opacity: 0.6,
    pointerEvents: "none",
  },
  toolbar: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: "4px",
    backgroundColor: tokens.colorNeutralBackground2,
  },
  editorWrapper: {
    position: "relative",
  },
  editor: {
    border: "none",
    outline: "none",
    padding: "12px",
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    overflowY: "auto",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  viewToggle: {
    cursor: "pointer",
    padding: "2px 8px",
    borderRadius: tokens.borderRadiusSmall,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
});

type FormatAction =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertOrderedList"
  | "insertUnorderedList"
  | "undo"
  | "redo";

export const RichTextEditorComponent: React.FC<IRichTextEditorProps> = ({
  content,
  placeholder,
  minHeight,
  isDisabled,
  onChange,
}) => {
  const styles = useStyles();
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = React.useState(false);
  const [charCount, setCharCount] = React.useState(0);

  // Initialize editor content
  React.useEffect(() => {
    if (editorRef.current && !showSource) {
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content || "";
      }
      setCharCount(editorRef.current.textContent?.length ?? 0);
    }
  }, [content, showSource]);

  const execCommand = React.useCallback((command: FormatAction) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  }, []);

  const handleInput = React.useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setCharCount(editorRef.current.textContent?.length ?? 0);
      onChange(html);
    }
  }, [onChange]);

  const handleSourceChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case "b":
            event.preventDefault();
            execCommand("bold");
            break;
          case "i":
            event.preventDefault();
            execCommand("italic");
            break;
          case "u":
            event.preventDefault();
            execCommand("underline");
            break;
          case "z":
            event.preventDefault();
            if (event.shiftKey) {
              execCommand("redo");
            } else {
              execCommand("undo");
            }
            break;
        }
      }
    },
    [execCommand]
  );

  return (
    <FluentProvider theme={webLightTheme}>
      <div
        className={`${styles.root} ${isDisabled ? styles.rootDisabled : ""}`}
      >
        {/* Formatting Toolbar */}
        <Toolbar className={styles.toolbar} size="small">
          <Tooltip content="Bold (Ctrl+B)" relationship="label">
            <ToolbarButton
              icon={<TextBoldRegular />}
              onClick={() => execCommand("bold")}
              aria-label="Bold"
            />
          </Tooltip>
          <Tooltip content="Italic (Ctrl+I)" relationship="label">
            <ToolbarButton
              icon={<TextItalicRegular />}
              onClick={() => execCommand("italic")}
              aria-label="Italic"
            />
          </Tooltip>
          <Tooltip content="Underline (Ctrl+U)" relationship="label">
            <ToolbarButton
              icon={<TextUnderlineRegular />}
              onClick={() => execCommand("underline")}
              aria-label="Underline"
            />
          </Tooltip>
          <Tooltip content="Strikethrough" relationship="label">
            <ToolbarButton
              icon={<TextStrikethroughRegular />}
              onClick={() => execCommand("strikeThrough")}
              aria-label="Strikethrough"
            />
          </Tooltip>

          <ToolbarDivider />

          <Tooltip content="Ordered List" relationship="label">
            <ToolbarButton
              icon={<TextNumberListLtrRegular />}
              onClick={() => execCommand("insertOrderedList")}
              aria-label="Ordered list"
            />
          </Tooltip>
          <Tooltip content="Bullet List" relationship="label">
            <ToolbarButton
              icon={<TextBulletListLtrRegular />}
              onClick={() => execCommand("insertUnorderedList")}
              aria-label="Bullet list"
            />
          </Tooltip>

          <ToolbarDivider />

          <Tooltip content="Undo (Ctrl+Z)" relationship="label">
            <ToolbarButton
              icon={<ArrowUndoRegular />}
              onClick={() => execCommand("undo")}
              aria-label="Undo"
            />
          </Tooltip>
          <Tooltip content="Redo (Ctrl+Shift+Z)" relationship="label">
            <ToolbarButton
              icon={<ArrowRedoRegular />}
              onClick={() => execCommand("redo")}
              aria-label="Redo"
            />
          </Tooltip>

          <ToolbarDivider />

          <Tooltip content="Toggle HTML source" relationship="label">
            <ToolbarButton
              icon={<CodeRegular />}
              onClick={() => setShowSource(!showSource)}
              aria-label="Toggle source view"
              appearance={showSource ? "primary" : "subtle"}
            />
          </Tooltip>
        </Toolbar>

        {/* Editor Area */}
        <div className={styles.editorWrapper}>
          {showSource ? (
            <Textarea
              value={content}
              onChange={(_, data) =>
                handleSourceChange({
                  target: { value: data.value },
                } as React.ChangeEvent<HTMLTextAreaElement>)
              }
              style={{ minHeight: `${minHeight}px`, fontFamily: "monospace" }}
              resize="vertical"
            />
          ) : (
            <div
              ref={editorRef}
              className={styles.editor}
              contentEditable={!isDisabled}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              style={{ minHeight: `${minHeight}px` }}
              data-placeholder={placeholder}
              role="textbox"
              aria-multiline="true"
              aria-label="Rich text editor"
            />
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span>{charCount} characters</span>
          <Badge appearance="outline" size="small">
            {showSource ? "HTML" : "Rich Text"}
          </Badge>
        </div>
      </div>
    </FluentProvider>
  );
};
```

---

## Build and Deploy Instructions

For each control above, follow these steps:

```bash
# 1. Initialize and install dependencies (already done by pac pcf init)
cd MyControl
npm install

# 2. Build the control
npm run build

# 3. Test in browser harness
npm start

# 4. Push to dev environment for quick testing
pac pcf push --publisher-prefix cr

# 5. Create a solution project for ALM transport
cd ..
mkdir MySolutionProject && cd MySolutionProject
pac solution init --publisher-name Contoso --publisher-prefix cr

# 6. Add control reference to solution
pac solution add-reference --path ../MyControl

# 7. Build the solution zip
dotnet build

# 8. Import the solution
pac solution import --path ./bin/Debug/MySolutionProject.zip --activate-plugins
```
