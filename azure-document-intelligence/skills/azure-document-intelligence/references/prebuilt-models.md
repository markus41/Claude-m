# Prebuilt Models Reference — Azure AI Document Intelligence

Complete field schema reference for all prebuilt models, including model IDs, extracted fields, locale support, and confidence score guidance.

---

## Model ID Quick Reference

| Model ID | Document Type | Pricing Tier | Locale Support |
|----------|--------------|-------------|----------------|
| `prebuilt-invoice` | Vendor invoices | S0 | 50+ locales |
| `prebuilt-receipt` | Sales receipts | S0 | 20+ locales |
| `prebuilt-idDocument` | Passports, driver's licenses | S0 | 15+ countries |
| `prebuilt-businessCard` | Business cards | S0 | en, ja, zh, ko |
| `prebuilt-w2` | US W-2 tax forms | S0 | en-US |
| `prebuilt-tax.us.1040` | US Form 1040 | S0 | en-US |
| `prebuilt-tax.us.1099.misc` | US 1099-MISC | S0 | en-US |
| `prebuilt-tax.us.1099.div` | US 1099-DIV | S0 | en-US |
| `prebuilt-tax.us.1099.int` | US 1099-INT | S0 | en-US |
| `prebuilt-tax.us.1099.nec` | US 1099-NEC | S0 | en-US |
| `prebuilt-tax.us.1099.k` | US 1099-K | S0 | en-US |
| `prebuilt-healthInsuranceCard.us` | US health insurance cards | S0 | en-US |
| `prebuilt-contract` | Contracts and agreements | S0 | en |
| `prebuilt-layout` | Any (structural) | S0/F0 | 300+ languages |
| `prebuilt-read` | Any (OCR text only) | S0/F0 | 300+ languages |
| `prebuilt-document` | Any (key-value pairs) | S0 | 300+ languages |

---

## prebuilt-invoice — Full Field Schema

### Top-Level Fields

| Field Name | Type | Description | Typical Confidence |
|------------|------|-------------|-------------------|
| `VendorName` | string | Name of the invoice issuer | 0.90-0.98 |
| `VendorAddress` | address | Full address of the vendor | 0.85-0.95 |
| `VendorAddressRecipient` | string | Name associated with vendor address | 0.80-0.92 |
| `VendorTaxId` | string | Tax identification number of vendor | 0.85-0.95 |
| `CustomerName` | string | Name of the invoice recipient | 0.88-0.96 |
| `CustomerAddress` | address | Full address of the customer | 0.85-0.95 |
| `CustomerAddressRecipient` | string | Name associated with customer address | 0.80-0.92 |
| `CustomerId` | string | Customer reference ID | 0.85-0.95 |
| `InvoiceId` | string | Invoice number/identifier | 0.92-0.99 |
| `InvoiceDate` | date | Date the invoice was issued | 0.90-0.98 |
| `DueDate` | date | Payment due date | 0.88-0.96 |
| `PurchaseOrder` | string | Purchase order reference number | 0.85-0.95 |
| `BillingAddress` | address | Billing address | 0.82-0.92 |
| `BillingAddressRecipient` | string | Name for billing address | 0.80-0.90 |
| `ShippingAddress` | address | Shipping/delivery address | 0.82-0.92 |
| `ShippingAddressRecipient` | string | Name for shipping address | 0.80-0.90 |
| `ServiceAddress` | address | Service location address | 0.80-0.90 |
| `ServiceAddressRecipient` | string | Name for service address | 0.78-0.88 |
| `RemittanceAddress` | address | Remittance/payment address | 0.80-0.90 |
| `RemittanceAddressRecipient` | string | Name for remittance address | 0.78-0.88 |
| `SubTotal` | currency | Subtotal before tax | 0.88-0.96 |
| `TotalTax` | currency | Total tax amount | 0.88-0.96 |
| `InvoiceTotal` | currency | Total amount due | 0.90-0.98 |
| `AmountDue` | currency | Outstanding balance | 0.88-0.96 |
| `PreviousUnpaidBalance` | currency | Previous balance carried forward | 0.82-0.92 |
| `PaymentTerm` | string | Payment terms description | 0.80-0.90 |
| `PaymentDetails` | array | Payment method details | 0.80-0.92 |
| `TaxDetails` | array | Tax breakdown by category | 0.85-0.95 |
| `CurrencyCode` | string | ISO 4217 currency code | 0.92-0.99 |
| `KVKNumber` | string | KVK registration (Netherlands) | 0.85-0.95 |

### Line Items (Items array)

| Field Name | Type | Description |
|------------|------|-------------|
| `Items[].Description` | string | Item description |
| `Items[].Quantity` | number | Quantity |
| `Items[].Unit` | string | Unit of measure |
| `Items[].UnitPrice` | currency | Price per unit |
| `Items[].ProductCode` | string | Product/SKU code |
| `Items[].Amount` | currency | Line total |
| `Items[].Tax` | currency | Tax for this line |
| `Items[].TaxRate` | number | Tax rate percentage |
| `Items[].Date` | date | Service/delivery date |

### Currency Type Format

```json
{
  "InvoiceTotal": {
    "type": "currency",
    "value": {
      "amount": 1250.00,
      "currencySymbol": "$",
      "currencyCode": "USD"
    },
    "content": "$1,250.00",
    "confidence": 0.95
  }
}
```

---

## prebuilt-receipt — Full Field Schema

| Field Name | Type | Description |
|------------|------|-------------|
| `MerchantName` | string | Store/merchant name |
| `MerchantAddress` | address | Store address |
| `MerchantPhoneNumber` | phoneNumber | Store phone number |
| `TransactionDate` | date | Date of transaction |
| `TransactionTime` | time | Time of transaction |
| `Subtotal` | currency | Subtotal before tax/tip |
| `TotalTax` | currency | Tax amount |
| `Tip` | currency | Tip/gratuity amount |
| `Total` | currency | Total paid |
| `PaymentType` | string | Cash, Credit Card, Debit Card |
| `Items[].Description` | string | Item name |
| `Items[].Quantity` | number | Quantity |
| `Items[].Price` | currency | Unit price |
| `Items[].TotalPrice` | currency | Line total |

**Supported receipt types:** Retail, Restaurant, Gas Station, Parking, Hotel

---

## prebuilt-idDocument — Full Field Schema

### Common Fields (All ID Types)

| Field Name | Type | Description |
|------------|------|-------------|
| `FirstName` | string | First/given name |
| `LastName` | string | Last/family name |
| `MiddleName` | string | Middle name(s) |
| `DocumentNumber` | string | Document ID number |
| `DateOfBirth` | date | Date of birth |
| `DateOfExpiration` | date | Expiration date |
| `DateOfIssue` | date | Issue date |
| `Sex` | string | M/F/X |
| `Address` | address | Address on document |
| `CountryRegion` | countryRegion | Issuing country/region |
| `Region` | string | State/province |
| `DocumentType` | string | driverLicense, passport, nationalIdentityCard |

### Passport-Specific Fields

| Field Name | Type | Description |
|------------|------|-------------|
| `Nationality` | countryRegion | Nationality |
| `PlaceOfBirth` | string | Place of birth |
| `MachineReadableZone` | object | MRZ data (line1, line2, line3) |
| `DocumentDiscriminator` | string | Passport book/card type |

### Driver's License-Specific Fields

| Field Name | Type | Description |
|------------|------|-------------|
| `Endorsements` | string | License endorsements |
| `Restrictions` | string | License restrictions |
| `VehicleClassifications` | string | Vehicle classes |

### Supported Countries

| Country | Driver's License | Passport | National ID |
|---------|-----------------|----------|-------------|
| United States | Yes | Yes | — |
| Canada | Yes | Yes | — |
| United Kingdom | Yes | Yes | — |
| Australia | Yes | Yes | — |
| EU member states | Yes | Yes | Yes |
| India | Yes (partial) | Yes | Yes (Aadhaar, PAN) |
| Japan | Yes | Yes | — |
| International | — | Yes (ICAO standard) | — |

---

## prebuilt-w2 — Full Field Schema

| Field Name | Type | Description |
|------------|------|-------------|
| `TaxYear` | string | Tax year |
| `W2FormVariant` | string | W-2, W-2AS, W-2GU, W-2VI |
| `Employee.Name` | string | Employee full name |
| `Employee.SSN` | string | Social Security Number |
| `Employee.Address` | address | Employee address |
| `Employer.Name` | string | Employer name |
| `Employer.EIN` | string | Employer Identification Number |
| `Employer.Address` | address | Employer address |
| `ControlNumber` | string | Control number |
| `WagesTipsOtherCompensation` | currency | Box 1 |
| `FederalIncomeTaxWithheld` | currency | Box 2 |
| `SocialSecurityWages` | currency | Box 3 |
| `SocialSecurityTaxWithheld` | currency | Box 4 |
| `MedicareWagesAndTips` | currency | Box 5 |
| `MedicareTaxWithheld` | currency | Box 6 |
| `SocialSecurityTips` | currency | Box 7 |
| `AllocatedTips` | currency | Box 8 |
| `DependentCareBenefits` | currency | Box 10 |
| `NonqualifiedPlans` | currency | Box 11 |
| `AdditionalInfo` | array | Boxes 12a-12d (code + amount) |
| `IsStatutoryEmployee` | boolean | Box 13 checkbox |
| `IsRetirementPlan` | boolean | Box 13 checkbox |
| `IsThirdPartySickPay` | boolean | Box 13 checkbox |
| `Other` | string | Box 14 |
| `StateTaxInfos` | array | State wages, state tax, employer state ID |
| `LocalTaxInfos` | array | Local wages, local tax, locality name |

---

## prebuilt-healthInsuranceCard.us — Full Field Schema

| Field Name | Type | Description |
|------------|------|-------------|
| `Insurer` | string | Insurance company name |
| `MemberName` | string | Card holder name |
| `MemberId` | string | Member ID number |
| `GroupNumber` | string | Group number |
| `PlanName` | string | Plan name |
| `PlanType` | string | HMO, PPO, EPO, POS |
| `IdNumberSuffix` | string | ID suffix |
| `Dependents` | array | Dependent names |
| `Payer` | string | Payer information |
| `PrescriptionInfo` | object | Rx BIN, PCN, Group |
| `Copays` | array | Copay amounts by benefit type |
| `ClaimLookbackPeriod` | string | Lookback period |
| `MedicareBeneficiaryIdentifier` | string | MBI number |
| `EffectiveDate` | date | Coverage effective date |

---

## Confidence Score Guidance

### Recommended Thresholds

| Use Case | Minimum Confidence | Action Below Threshold |
|----------|-------------------|----------------------|
| General field extraction | 0.70 | Flag for human review |
| Financial amounts (invoices, receipts) | 0.85 | Route to manual verification |
| PII fields (SSN, document numbers) | 0.90 | Block auto-processing |
| Tax form fields (legal/regulatory) | 0.90 | Manual review required |
| Document type (composed models) | 0.80 | Re-classify or manual routing |

### Confidence Score Interpretation

| Range | Interpretation | Recommended Action |
|-------|---------------|-------------------|
| 0.95-1.00 | Very high — field clearly readable | Auto-process |
| 0.85-0.94 | High — field likely correct | Auto-process with audit trail |
| 0.70-0.84 | Moderate — some ambiguity | Flag for spot-check review |
| 0.50-0.69 | Low — significant uncertainty | Route to human review |
| < 0.50 | Very low — likely incorrect | Discard or full manual entry |

### Per-Field vs Per-Document Confidence

- `document.confidence` — overall confidence that the correct model/doc type was matched
- `field.confidence` — confidence for a specific extracted field value
- `table.cells[].confidence` — confidence for individual table cells
- Always check field-level confidence, not just document-level

---

## Model Versioning

Pin prebuilt models to a specific version in production to prevent unexpected behavior from model updates:

```
prebuilt-invoice                     → latest GA version (may change)
prebuilt-invoice:2024-11-30          → pinned to specific version
```

Model version format: `{modelId}:{yyyy-MM-dd}`

Check available versions:

```http
GET https://{endpoint}/documentintelligence/documentModels/prebuilt-invoice?api-version=2024-11-30
```

The response includes `apiVersion`, `description`, and `docTypes` with the full field schema.

---

## Common Gotchas

1. **Invoice vs receipt** — Do not use `prebuilt-invoice` for receipts or vice versa. Despite being "payment documents," the field schemas are completely different. Invoice total ≠ receipt total field path.

2. **ID document PII** — The `prebuilt-idDocument` model extracts SSNs, passport numbers, and other PII. Ensure proper encryption, access controls, and audit logging. Never log extracted PII to application logs.

3. **Tax form variants** — US 1099 has multiple variants (MISC, DIV, INT, NEC, K). Each has a separate model ID with a unique field schema. Using the wrong variant model will return empty or incorrect fields.

4. **Currency parsing** — Currency fields return a structured object with `amount` (number) and `currencyCode` (string). Do not parse the `content` string for financial calculations — use the `value.amount` property.

5. **Multi-page invoices** — A single PDF may contain multiple invoices. The `documents` array in the result may have multiple entries, each with `boundingRegions` indicating which pages belong to which invoice.

6. **Locale parameter** — Set the `locale` query parameter when analyzing documents in a specific language. This improves accuracy for date parsing (MM/DD vs DD/MM), number formatting (comma vs period decimal separator), and field detection.
