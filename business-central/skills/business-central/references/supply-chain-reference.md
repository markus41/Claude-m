# Business Central Supply Chain Reference

## Items (Inventory Master)

### Item Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | Item number (SKU) |
| `displayName` | string | Item description |
| `type` | string | `Inventory`, `Service`, `Non-Inventory` |
| `itemCategoryCode` | string | Item category for grouping |
| `unitCost` | decimal | Standard/average unit cost |
| `unitPrice` | decimal | Default sales price |
| `inventory` | decimal | Current net quantity on hand |
| `unitOfMeasure` | object | `{ code, displayName }` |
| `baseUnitOfMeasureCode` | string | Base UoM code |
| `gtin` | string | Global Trade Item Number (barcode) |
| `blocked` | boolean | `true` = item locked for new transactions |
| `priceIncludesTax` | boolean | `true` = unit price is tax-inclusive |
| `taxGroupCode` | string | Tax group for VAT/sales tax calculation |

**Item types:**

| Type | Inventory tracked | Costing | Use case |
|---|---|---|---|
| `Inventory` | Yes | FIFO / Avg / Standard | Physical goods |
| `Service` | No | N/A | Labor or service hours |
| `Non-Inventory` | No | Direct cost | Consumables expensed at purchase |

### List Items with Inventory Levels

```http
GET {baseUrl}/items?$select=id,number,displayName,type,inventory,unitCost,unitPrice,blocked&$filter=type eq 'Inventory' and blocked eq false&$orderby=number asc
```

### Create Item

```http
POST {baseUrl}/items
{
  "number": "WIDGET-2000",
  "displayName": "Widget Pro 2000",
  "type": "Inventory",
  "unitCost": 89.99,
  "unitPrice": 199.99,
  "baseUnitOfMeasureCode": "PCS",
  "taxGroupCode": "TAXABLE"
}
```

Item numbers must be unique. If BC number series is configured for auto-numbering, omit `number` and BC assigns it.

## Sales Orders

### Sales Order Status Flow

```
Draft → Open → Released → Shipped → Invoiced
```

| Status | Meaning |
|---|---|
| `Draft` | Order created but not confirmed |
| `Open` | Order confirmed and editable |
| `Released` | Released to warehouse for picking |
| `Shipped` | All lines shipped (partially or fully) |
| `Invoiced` | Fully invoiced (sales invoice posted) |

### Sales Order Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | Order number |
| `customerId` | GUID | Customer record ID |
| `customerName` | string | Customer display name (read-only) |
| `orderDate` | date | Order creation date |
| `shipmentDate` | date | Requested shipment date |
| `status` | string | See status flow above |
| `currencyCode` | string | ISO 4217 |
| `totalAmountExcludingTax` | decimal | Line total before tax (read-only) |
| `totalAmountIncludingTax` | decimal | Line total including tax (read-only) |
| `paymentTermsId` | GUID | Payment terms |
| `shippingPostalAddress` | object | Ship-to address |
| `billToCustomerId` | GUID | Bill-to customer (if different from ship-to) |
| `externalDocumentNumber` | string | Customer PO number |

### Sales Order Line Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `documentId` | GUID | Parent sales order ID |
| `lineNumber` | integer | Line sequence (increments by 10000) |
| `lineType` | string | `Item`, `G/L Account`, `Resource`, `Fixed Asset` |
| `itemId` | GUID | Item record (required if `lineType eq 'Item'`) |
| `accountId` | GUID | GL account (required if `lineType eq 'G/L Account'`) |
| `description` | string | Line description |
| `quantity` | decimal | Ordered quantity |
| `unitPrice` | decimal | Sales price per unit |
| `discountPercent` | decimal | Line discount % |
| `discountAmount` | decimal | Computed discount (read-only) |
| `taxCode` | string | Tax group code |
| `amountIncludingTax` | decimal | Line total with tax (read-only) |
| `quantityShipped` | decimal | Quantity shipped so far (read-only) |
| `quantityInvoiced` | decimal | Quantity invoiced so far (read-only) |

### Retrieve Sales Orders with Lines

```http
GET {baseUrl}/salesOrders?$select=id,number,customerName,orderDate,shipmentDate,status,totalAmountIncludingTax&$expand=salesOrderLines($select=lineType,description,quantity,unitPrice,discountPercent,amountIncludingTax)&$filter=status ne 'Invoiced'&$orderby=shipmentDate asc
```

## Sales Invoices

### Sales Invoice Status Flow

```
Draft → Open (posted) → Paid (via payment application)
```

A sales invoice in status `Open` is posted but awaiting payment. Once payment is applied via the customer ledger, remaining amount drops to 0.

**Never delete a posted invoice.** Use a sales credit memo to reverse.

### Sales Invoice Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | Invoice number |
| `invoiceDate` | date | Invoice date |
| `dueDate` | date | Payment due date |
| `customerId` | GUID | Customer record |
| `customerName` | string | Customer name (read-only) |
| `status` | string | `Draft`, `Open`, `Paid`, `Cancelled` |
| `currencyCode` | string | Invoice currency |
| `totalAmountExcludingTax` | decimal | Subtotal |
| `totalAmountIncludingTax` | decimal | Total with tax |
| `paymentTermsId` | GUID | Payment terms |
| `externalDocumentNumber` | string | Customer PO reference |
| `remainingAmount` | decimal | Unpaid balance (read-only, populated after posting) |

### Create and Post Sales Invoice

```http
# 1. Create the invoice header
POST {baseUrl}/salesInvoices
{
  "customerId": "{customerGuid}",
  "invoiceDate": "2026-03-15",
  "dueDate": "2026-04-14",
  "currencyCode": "USD",
  "externalDocumentNumber": "PO-CUST-2026-042"
}

# 2. Add lines
POST {baseUrl}/salesInvoices({invoiceId})/salesInvoiceLines
{
  "lineType": "Item",
  "itemId": "{itemGuid}",
  "description": "Widget Pro 2000",
  "quantity": 5,
  "unitPrice": 199.99
}

# 3. Post the invoice
POST {baseUrl}/salesInvoices({invoiceId})/Microsoft.NAV.post
```

### List Open (Posted, Unpaid) Invoices

```http
GET {baseUrl}/salesInvoices?$select=id,number,invoiceDate,dueDate,customerName,totalAmountIncludingTax,remainingAmount,status&$filter=status eq 'Open'&$orderby=dueDate asc
```

### Sales Credit Memos

To reverse a posted sales invoice, create a sales credit memo:

```http
POST {baseUrl}/salesCreditMemos
{
  "customerId": "{customerGuid}",
  "creditMemoDate": "2026-03-20",
  "invoiceId": "{originalInvoiceGuid}"
}
```

When `invoiceId` is provided, BC copies the invoice lines automatically. Review and adjust quantities as needed, then post.

## Purchase Orders

### Purchase Order Status Flow

```
Draft → Open → Released → Received → Invoiced
```

| Status | Meaning |
|---|---|
| `Draft` | PO created but not sent to vendor |
| `Open` | PO confirmed |
| `Released` | Released to warehouse for receiving |
| `Received` | All lines partially or fully received |
| `Invoiced` | Fully invoiced |

### Purchase Order Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | PO number |
| `vendorId` | GUID | Vendor record |
| `vendorName` | string | Vendor name (read-only) |
| `vendorInvoiceNumber` | string | Vendor's document reference |
| `orderDate` | date | PO creation date |
| `expectedReceiptDate` | date | Expected delivery date |
| `status` | string | See status flow above |
| `currencyCode` | string | ISO 4217 |
| `totalAmountIncludingTax` | decimal | PO total with tax (read-only) |
| `paymentTermsId` | GUID | Payment terms |
| `shipToAddressLine1` | string | Delivery address |

### Purchase Order Line Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `documentId` | GUID | Parent PO ID |
| `lineNumber` | integer | Sequence number |
| `lineType` | string | `Item`, `G/L Account`, `Resource`, `Fixed Asset` |
| `itemId` | GUID | Item record |
| `description` | string | Line description |
| `quantity` | decimal | Ordered quantity |
| `directUnitCost` | decimal | Unit cost from vendor |
| `discountPercent` | decimal | Line discount |
| `taxCode` | string | Tax group |
| `quantityReceived` | decimal | Quantity received so far (read-only) |
| `quantityInvoiced` | decimal | Quantity invoiced (read-only) |

### Create and Receive Purchase Order

```http
# 1. Create PO header
POST {baseUrl}/purchaseOrders
{
  "vendorId": "{vendorGuid}",
  "orderDate": "2026-03-01",
  "expectedReceiptDate": "2026-03-20",
  "vendorInvoiceNumber": "VINV-0042",
  "currencyCode": "USD"
}

# 2. Add lines
POST {baseUrl}/purchaseOrders({poId})/purchaseOrderLines
{
  "lineType": "Item",
  "itemId": "{itemGuid}",
  "description": "Widget Pro 2000",
  "quantity": 100,
  "directUnitCost": 89.99
}

# 3. Receive the PO (creates item ledger entries)
POST {baseUrl}/purchaseOrders({poId})/Microsoft.NAV.receive
```

After receiving, `quantityReceived` on each line is updated and inventory increases.

## Purchase Invoices

Purchase invoices can be standalone or derived from a received PO.

### Create Purchase Invoice

```http
POST {baseUrl}/purchaseInvoices
{
  "vendorId": "{vendorGuid}",
  "invoiceDate": "2026-03-05",
  "dueDate": "2026-04-04",
  "vendorInvoiceNumber": "VINV-2026-0042",
  "currencyCode": "USD"
}
```

### Purchase Invoice Line

```http
POST {baseUrl}/purchaseInvoices({invoiceId})/purchaseInvoiceLines
{
  "lineType": "Item",
  "itemId": "{itemGuid}",
  "description": "Widget Pro 2000",
  "quantity": 100,
  "directUnitCost": 89.99
}
```

### Post Purchase Invoice

```http
POST {baseUrl}/purchaseInvoices({invoiceId})/Microsoft.NAV.post
```

Posting creates GL entries (debit Inventory / expense, credit AP), item ledger entries (if items), and a vendor ledger entry.

## Item Ledger Entries

Item ledger entries are the inventory audit trail — one record per item movement.

```http
GET {baseUrl}/itemLedgerEntries?$select=id,itemId,itemNumber,postingDate,entryType,quantity,costAmount,salesAmount,documentNumber,externalDocumentNumber&$filter=itemId eq {itemId} and postingDate ge 2026-01-01&$orderby=postingDate desc
```

### Entry Types

| entryType | Triggered by | Quantity effect |
|---|---|---|
| `Purchase` | Posted purchase invoice/receipt | Positive |
| `Sale` | Posted sales invoice/shipment | Negative |
| `Positive Adjmt.` | Manual positive adjustment journal | Positive |
| `Negative Adjmt.` | Manual negative adjustment journal | Negative |
| `Transfer` | Stock transfer between locations | Zero net effect |
| `Consumption` | Production BOM consumption | Negative |
| `Output` | Production order output | Positive |

### Inventory Valuation

**Current inventory value per item:**

```
inventoryValue = SUM(costAmount) for all entries where itemId = {id}
```

`costAmount` is signed — positive for receipts, negative for issues. The sum represents the total inventory value at cost.

**Inventory turnover (annualized):**

```
COGS (annual) = SUM(costAmount) for entryType eq 'Sale' (last 12 months, absolute value)
averageInventory = (openingInventoryValue + closingInventoryValue) / 2
turnoverRatio = COGS / averageInventory
```

## Shipping and Fulfillment

### Shipment Methods

```http
GET {baseUrl}/shipmentMethods?$select=id,code,displayName
```

Common codes: `EXW` (Ex Works), `FCA`, `CIF`, `DDP`, `PICKUP`.

### Locations

BC supports multi-location inventory. Filter item ledger entries by location:

```http
GET {baseUrl}/itemLedgerEntries?$select=id,itemNumber,locationCode,quantity,entryType&$filter=locationCode eq 'MAIN' and itemId eq {itemId}
```

## Credit Memos (Sales)

Sales credit memos reverse posted sales invoices.

```http
GET {baseUrl}/salesCreditMemos?$select=id,number,creditMemoDate,customerName,totalAmountIncludingTax,status&$filter=status eq 'Draft'
```

Credit memo statuses: `Draft` → `Open` (posted). A posted credit memo reduces the customer's outstanding balance.

## Units of Measure

```http
GET {baseUrl}/unitsOfMeasure?$select=id,code,displayName,internationalStandardCode
```

Common codes: `PCS` (pieces), `BOX`, `KG`, `LTR`, `HR` (hours for services), `DAY`.

Item unit-of-measure conversions are managed in BC setup and enforce quantity conversion when an item is sold in a UoM other than its base UoM.
