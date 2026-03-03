# Model-Driven Apps Reference

## Overview

Model-driven apps are built on top of Dataverse and derive their UI automatically from the data model. Forms, views, dashboards, business rules, and business process flows are configured declaratively. This reference covers app creation via PAC CLI, sitemap XML, form customization, view XML, business rules, command bar customization, PCF control integration, and solution-aware components.

---

## App Creation via PAC CLI

```bash
# Authenticate to environment
pac auth create --environment https://contoso.crm.dynamics.com

# Initialize a solution (container for all components)
pac solution init \
  --publisher-name Contoso \
  --publisher-prefix cr \
  --outputDirectory ./solutions/ContosoCRM

# Create model-driven app component reference (add to solution)
# Model-driven apps are created and configured via the maker portal
# or directly via Dataverse Web API

# Export solution after configuring app in portal
pac solution export \
  --path ./artifacts/ContosoCRM_1_0.zip \
  --name ContosoCRM \
  --managed false

# Import to target environment
pac solution import \
  --path ./artifacts/ContosoCRM_1_0.zip
```

### Dataverse Web API — Create App
```json
POST /api/data/v9.2/appmodules
{
  "name": "ContosoCRM",
  "uniquename": "cr_ContosoCRM",
  "description": "Customer Relationship Management App",
  "clienttype": 4,
  "isdefault": false
}
```

`clienttype` values: `1` = Web, `2` = Phone, `4` = Tablet, `8` = Desktop (Unified Interface).

---

## Sitemap XML

The sitemap defines the navigation structure: areas contain groups, which contain subareas that link to tables, dashboards, or URLs.

```xml
<SiteMap>
  <Area Id="CRMArea" Title="CRM" Icon="/_imgs/areas/area_crm_16.gif">
    <Group Id="SalesGroup" Title="Sales">
      <SubArea Id="AccountsSubArea"
               Entity="account"
               Title="Accounts"
               Icon="/_imgs/crm/ico_16_account.gif"
               DescriptionResourceId="Account_SubArea" />
      <SubArea Id="OpportunitiesSubArea"
               Entity="opportunity"
               Title="Opportunities" />
      <SubArea Id="LeadsSubArea"
               Entity="lead"
               Title="Leads" />
    </Group>
    <Group Id="SupportGroup" Title="Support">
      <SubArea Id="CasesSubArea"
               Entity="incident"
               Title="Cases" />
      <SubArea Id="DashboardSubArea"
               Title="Dashboard"
               Url="/main.aspx?pagetype=dashboard&amp;id={dashboard-id}" />
    </Group>
  </Area>
</SiteMap>
```

### Subarea Types
| SubArea Attribute | Purpose |
|---|---|
| `Entity="account"` | Link to a table grid view |
| `Url="/main.aspx?..."` | Custom URL or dashboard |
| `Icon="..."` | 16x16 image path or SVG |
| `AvailableOffline="true"` | Include in mobile offline profile |

---

## Form Customization

### Form Types

| Form Type | `formtype` Value | Description |
|---|---|---|
| Main | `2` | Full-page edit form — primary interaction surface |
| Quick Create | `7` | Compact modal for rapid record creation |
| Quick View | `6` | Read-only embedded view of a related record |
| Card | `11` | Compact mobile view |
| Main - Interactive Experience | `12` | Used in interactive dashboards (e.g., case management) |

### Form XML Structure

Model-driven forms are stored as XML in Dataverse (`SystemForm` table). Key structure:

```xml
<form>
  <tabs>
    <tab name="general" labelid="generalTabLabel" visible="true" expanded="true">
      <columns>
        <column width="100%">
          <sections>
            <section name="accountInfo" showlabel="true" label="Account Information">
              <rows>
                <row>
                  <cell colspan="1" rowspan="1" showlabel="true" locklevel="0">
                    <labels>
                      <label description="Account Name" languagecode="1033" />
                    </labels>
                    <control id="name" classid="{4273EDBD-AC1D-40d3-9FB2-095C621B552D}"
                             datafieldname="name" disabled="false" />
                  </cell>
                </row>
                <row>
                  <cell colspan="2">
                    <control id="telephone1" classid="{4273EDBD-AC1D-40d3-9FB2-095C621B552D}"
                             datafieldname="telephone1" disabled="false" />
                  </cell>
                </row>
              </rows>
            </section>
          </sections>
        </column>
      </columns>
    </tab>
    <tab name="contacts" label="Contacts">
      <columns>
        <column width="100%">
          <sections>
            <section name="contactsSubgrid">
              <rows>
                <row>
                  <cell>
                    <control id="Contacts"
                             classid="{E7A81278-8635-4d9e-8D4D-59480B391C5B}"
                             datafieldname="account_contacts"
                             disabled="false" />
                  </cell>
                </row>
              </rows>
            </section>
          </sections>
        </column>
      </columns>
    </tab>
  </tabs>
  <formLibraries>
    <Library name="cr_/js/accountFormLibrary.js" libraryUniqueId="{guid}" />
  </formLibraries>
  <events>
    <event name="onload" application="false" active="false">
      <Handlers>
        <Handler functionName="AccountFormLib.onLoad"
                 libraryName="cr_/js/accountFormLibrary.js"
                 handlerUniqueId="{guid}"
                 enabled="true"
                 parameters="" />
      </Handlers>
    </event>
  </events>
</form>
```

### Common Control Class IDs
| Control Type | Class ID |
|---|---|
| Single Line Text | `{4273EDBD-AC1D-40d3-9FB2-095C621B552D}` |
| Option Set (Choice) | `{3EF39988-22BB-4f0b-BBBE-64B5A3748AEE}` |
| Lookup | `{270BD3DB-D9AF-4782-9025-509E298DEC0A}` |
| Date/Time | `{5B773807-9FB2-42db-97C3-7A91EFF8ADFF}` |
| Two Options (Bool) | `{67FAC785-CD58-4f9f-ABB3-4B7DDC6ED5ED}` |
| Subgrid | `{E7A81278-8635-4d9e-8D4D-59480B391C5B}` |
| Web Resource | `{9FDF5F91-88B1-47f4-AD53-C11EFC01A01D}` |
| PCF Control | (varies by control manifest) |

---

## View XML

Views are defined by FetchXML (query) and LayoutXML (columns). Stored in `SavedQuery` (system views) and `UserQuery` (personal views).

```xml
<!-- fetchxml — defines the query -->
<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
  <entity name="account">
    <attribute name="name" />
    <attribute name="telephone1" />
    <attribute name="address1_city" />
    <attribute name="statuscode" />
    <attribute name="accountid" />
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0" />
    </filter>
    <order attribute="name" descending="false" />
  </entity>
</fetch>

<!-- layoutxml — defines column display -->
<grid name="resultset" object="1" jump="name" select="1" icon="0" preview="1">
  <row name="result" id="accountid">
    <cell name="name" width="300" />
    <cell name="telephone1" width="150" />
    <cell name="address1_city" width="150" />
    <cell name="statuscode" width="100" />
  </row>
</grid>
```

---

## Business Rules

Business rules are declarative conditions and actions that run on the form (client-side) or server-side (before save). They are defined in the Dataverse solution.

### Business Rule Actions
| Action | Description |
|---|---|
| Show / Hide field | Toggle field visibility based on condition |
| Set field value | Programmatically set a field value |
| Set business required | Make a field required or optional |
| Set default value | Pre-populate a field |
| Lock / Unlock field | Control editability |
| Show error message | Display validation error on a field |
| Set visibility of tabs/sections | Toggle entire form sections |

### Business Rule Scope
| Scope | Behavior |
|---|---|
| Entity (All Forms) | Runs on all forms and server-side |
| Specific Form | Runs only on the named form |

### Example: Show Additional Field if Priority is High
**Condition**: `Priority` = Urgent
**Action**: Show `Escalation Reason` field (hidden by default)

This is configured visually in the business rule designer — no code required.

---

## Command Bar Customization

### Ribbon XML (Classic — via Solution Explorer)
```xml
<CommandDefinitions>
  <CommandDefinition Id="Contoso.account.Form.SendEmail.Command">
    <EnableRules>
      <EnableRule Id="Mscrm.SelectionCountAtLeastOne" />
    </EnableRules>
    <DisplayRules>
      <DisplayRule Id="Mscrm.NotOffline" />
    </DisplayRules>
    <Actions>
      <JavaScriptFunction Library="$webresource:cr_/js/ribbonActions.js"
                           FunctionName="sendEmailToAccount">
        <CrmParameter Value="SelectedControlSelectedItemIds" />
      </JavaScriptFunction>
    </Actions>
  </CommandDefinition>
</CommandDefinitions>

<RibbonDiffXml>
  <CustomActions>
    <CustomAction Id="Contoso.account.Form.SendEmail.CustomAction"
                  Location="Mscrm.Form.account.MainTab.Actions.Controls._children"
                  Sequence="25">
      <CommandUIDefinition>
        <Button Id="Contoso.account.Form.SendEmail.Button"
                Command="Contoso.account.Form.SendEmail.Command"
                LabelText="Send Email"
                ToolTipTitle="Send Email"
                ToolTipDescription="Send an email to this account"
                TemplateAlias="o1"
                Image16by16="/_imgs/ribbon/sendEmail_16.png"
                Image32by32="/_imgs/ribbon/sendEmail_32.png" />
      </CommandUIDefinition>
    </CustomAction>
  </CustomActions>
</RibbonDiffXml>
```

### Modern Command Bar (Power Apps Command Designer)
Modern command bars use the Command Designer in the maker portal. Commands are stored as `appaction` records in Dataverse.

```json
// Create command via Dataverse Web API
POST /api/data/v9.2/appactions
{
  "name": "cr_SendEmailCommand",
  "uniquename": "cr_SendEmailCommand",
  "buttonlabeltext": "Send Email",
  "buttontooltiptitle": "Send Email",
  "context": 1,
  "clienttype": 1,
  "onclickeventjavascriptfunctionname": "sendEmailToAccount",
  "onclickeventjavascriptwebresourceid@odata.bind": "/webresourceset({web-resource-id})"
}
```

---

## PCF Control Integration

PCF (PowerApps Component Framework) controls can be embedded in model-driven app forms.

### Manifest for Model-Driven Field Control
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest>
  <control namespace="Contoso" constructor="RatingControl" version="1.0.0"
           display-name-key="Rating_Display_Key"
           description-key="Rating_Desc_Key"
           control-type="standard">
    <type-group name="numbers">
      <type>Whole.None</type>
    </type-group>
    <property name="value" display-name-key="Value" description-key="Value_Desc"
              of-type-group="numbers" usage="bound" required="true" />
    <resources>
      <code path="index.ts" order="1" />
      <css path="css/RatingControl.css" order="1" />
    </resources>
  </control>
</manifest>
```

### index.ts Scaffold
```typescript
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class RatingControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;
    private _value: number;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
        this._value = context.parameters.value.raw || 0;
        this.renderStars();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._value = context.parameters.value.raw || 0;
        this.renderStars();
    }

    public getOutputs(): IOutputs {
        return { value: this._value };
    }

    public destroy(): void {
        this._container.innerHTML = "";
    }

    private renderStars(): void {
        this._container.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            star.textContent = i <= this._value ? "★" : "☆";
            star.style.cursor = "pointer";
            star.style.fontSize = "24px";
            star.onclick = () => {
                this._value = i;
                this._notifyOutputChanged();
                this.renderStars();
            };
            this._container.appendChild(star);
        }
    }
}
```

### PCF Build and Deploy Commands
```bash
# Initialize new PCF project
pac pcf init --namespace Contoso --name RatingControl --template field --run-npm-install

# Build
npm run build

# Watch mode for development
npm start watch

# Push to environment
pac pcf push --publisher-prefix cr

# Package into solution
pac solution add-reference --path ./RatingControl
pac solution build
```

---

## Solution-Aware Components

All model-driven app components should be solution-aware for proper ALM.

### Component Types in Solutions
| Component | `componenttype` | Notes |
|---|---|---|
| Entity (Table) | `1` | Includes all metadata |
| Attribute (Column) | `2` | Individual column |
| View | `26` | `SavedQuery` record |
| Form | `24` | `SystemForm` record |
| App Module | `80` | Model-driven app |
| Site Map | `62` | Navigation structure |
| Business Rule | `29` | `Workflow` with category 2 |
| PCF Control | `66` | Custom control |
| Web Resource | `61` | JS, CSS, HTML files |
| Command | `92` | `AppAction` record |

### Add Components to Solution via PAC CLI
```bash
# Add a specific component to a solution
pac solution add-reference \
  --solutionUniqueName ContosoCRM \
  --componentId {table-guid} \
  --componentType 1

# Export solution
pac solution export --name ContosoCRM --path ./ContosoCRM.zip --managed false
```

### Managed vs Unmanaged Layers
| Scenario | Layer Type |
|---|---|
| Development environment | Unmanaged — full edit access |
| Test / Production | Managed — locked from direct edits |
| Hotfix override in production | Unmanaged layer on top of managed base |

Use **Remove Active Customization** in the solution UI to strip an unmanaged layer and revert to the managed base.

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `0x80040265` — Record not found | GUID referenced in lookup does not exist | Verify record exists before setting lookup; refresh views |
| `0x80048306` — Privilege check failed | User lacks security role to read/write the table | Assign appropriate Dataverse security role |
| `0x80040220` — Duplicate Detection | A duplicate detection rule fired on save | Review duplicate detection rules; adjust thresholds or deactivate rule if needed |
| `0x8004022E` — Plugin blocked save | A registered plugin threw an `InvalidPluginExecutionException` | Check plugin trace log in Power Platform admin center |
| `0x80044150` — Business rule failed | A business rule's error action was triggered | Review business rule conditions; provide required input |
| Form does not show on app | Component not added to solution; app not published | Add form to solution, set as default, publish customizations |
| Command bar button not visible | Enable rule evaluates to false | Debug ribbon via `?ribbondebug=1` query param in the URL |
| PCF control shows "Error loading control" | Build artifacts missing; incorrect publisher prefix | Run `npm run build`; verify `pac pcf push` completed; check prefix |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Forms per entity (table) | No hard limit | Keep active forms to a minimum; use form selector |
| Columns per form section | No hard limit | Performance degrades above ~50 visible columns per form |
| Subgrid records displayed | 5,000 | Default; paginated |
| Business rules per entity | No hard limit | Keep under 20 active rules per entity for performance |
| Business process flow stages | 10 | Per flow |
| Business process flow steps per stage | 30 | Per stage |
| PCF controls per solution | No hard limit | Each control is a separate solution component |
| App modules per environment | No hard limit | License limits apply to users |
| Sitemap areas | No hard limit | UI becomes unwieldy above ~10 areas |
| Web resources per solution | No hard limit | 5 MB per individual web resource |

---

## Common Patterns and Gotchas

### Always Use Publisher Prefix
All custom components (tables, columns, web resources, PCF controls) must use the publisher prefix (e.g., `cr_`). Unprefixed components collide with platform components during upgrades.

### Publish After Every Change
Model-driven app changes are not visible to users until published. Run `pac solution publish` or use the **Publish All Customizations** button in the portal. In CI/CD, always publish after importing a solution.

### Form Display Order Matters
When multiple forms are available for a table, Dataverse shows the form that the user last used, falling back to the one highest in the form order list. Set the default form explicitly and order forms by priority in the solution.

### Business Rules Are Not Plugins
Business rules run client-side (on the form) unless scope is set to "Entity." For complex server-side validation, use a Dataverse plugin or Power Automate real-time workflow — business rules are not a substitute.

### PCF Virtual Controls vs Standard Controls
Virtual PCF controls use a React virtual DOM and do not have direct DOM access — they receive and return data through the framework interface only. Standard controls get a DOM container. Virtual controls load faster in forms with many controls.

### Security Roles Are Cumulative
A user's effective permissions are the union of all assigned security roles. Roles cannot subtract permissions from each other. Use teams to assign roles at scale — direct user assignment is hard to audit.
