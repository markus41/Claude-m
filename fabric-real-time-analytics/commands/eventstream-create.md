---
name: eventstream-create
description: "Design an Eventstream pipeline — configure sources, transformations, and destinations for streaming ingestion"
argument-hint: "<source-type> --destination <kql-db|lakehouse|reflex> [--transform <filter|aggregate>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create an Eventstream Pipeline

Design and configure a Fabric Eventstream with sources, inline transformations, and destinations.

## Instructions

### 1. Validate Inputs

- `<source-type>` — One of: `event-hub`, `iot-hub`, `custom-app`, `blob-storage`, `sample-data`. Ask if not provided.
- `--destination` — Target destination: `kql-db`, `lakehouse`, `reflex`, `custom-endpoint`. Default: `kql-db`.
- `--transform` — Optional transformation: `filter`, `aggregate`, `manage-fields`, `expand`. Can specify multiple.

### 2. Create the Eventstream Item

```bash
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items" \
  --headers "Content-Type=application/json" \
  --body '{
    "type": "Eventstream",
    "displayName": "<eventstream-name>",
    "description": "<description>"
  }'
```

### 3. Configure the Source

**Azure Event Hubs**:
Ask the user for:
- Event Hub namespace connection string
- Event Hub name
- Consumer group (default: `$Default`)
- Data format (JSON, CSV, Avro)

Guide the user to add the Event Hubs source in the Eventstream designer:
1. Click **+ New source** > **Azure Event Hubs**.
2. Enter the connection string and Event Hub name.
3. Select the consumer group and data format.

**Azure IoT Hub**:
Ask the user for:
- IoT Hub connection string (built-in endpoint)
- Consumer group

**Custom App**:
1. Click **+ New source** > **Custom App**.
2. The Eventstream generates an endpoint and connection string.
3. Provide the user with sample code to send events:

```typescript
import { EventHubProducerClient } from "@azure/event-hubs";

const connectionString = "<eventstream-connection-string>";
const eventHubName = "<eventstream-hub-name>";

const producer = new EventHubProducerClient(connectionString, eventHubName);
const batch = await producer.createBatch();
batch.tryAdd({ body: { /* event data */ } });
await producer.sendBatch(batch);
await producer.close();
```

**Sample Data**:
1. Click **+ New source** > **Sample data**.
2. Select from available sample datasets (e.g., Bicycles, Stock Market, Yellow Taxi).
3. Useful for testing pipeline configurations before connecting real sources.

### 4. Configure Transformations (when --transform)

**Filter**:
1. Click **+ Add transformation** > **Filter**.
2. Define the filter condition:
   - Column name, operator (equals, not equals, greater than, less than, contains), value.
   - Example: `Temperature > 0 AND Temperature < 100`

**Aggregate**:
1. Click **+ Add transformation** > **Aggregate**.
2. Select the aggregation function (SUM, AVG, MIN, MAX, COUNT).
3. Select the group-by columns.
4. Select the window type:
   - **Tumbling**: Fixed non-overlapping windows (e.g., every 5 minutes).
   - **Hopping**: Overlapping windows (e.g., 10-minute window every 2 minutes).
   - **Session**: Gap-based windows (e.g., group until 30-minute inactivity).
5. Set the window size and hop size (for hopping windows).

**Manage Fields**:
1. Click **+ Add transformation** > **Manage fields**.
2. Select which columns to keep, rename, or remove.
3. Add computed columns using expressions.

**Expand**:
1. Click **+ Add transformation** > **Expand**.
2. Select the array/dynamic column to expand.
3. Each array element becomes a separate row.

### 5. Configure the Destination

**KQL Database**:
1. Click **+ Add destination** > **KQL Database**.
2. Select the target Eventhouse and KQL database.
3. Select or create the destination table.
4. Map source fields to destination columns.
5. Select the ingestion mapping (if previously created).

**Lakehouse**:
1. Click **+ Add destination** > **Lakehouse**.
2. Select the target Lakehouse.
3. Specify the Delta table name (will be created if it does not exist).

**Reflex (Data Activator)**:
1. Click **+ Add destination** > **Reflex**.
2. Select or create a Reflex item.
3. Map the event fields to the object ID and monitored properties.

**Custom Endpoint**:
1. Click **+ Add destination** > **Custom endpoint**.
2. The Eventstream generates a connection string for consumers.
3. Use the Event Hubs SDK to consume events from this endpoint.

### 6. Validate the Pipeline

Before activating, verify:
- Source is connected and receiving data (check the preview pane).
- Transformations produce the expected output schema.
- Destination table schema matches the transformed output.
- Ingestion mapping (if used) aligns column names and types.

### 7. Display Summary

Show the user:
- Eventstream name and ID
- Source type and configuration
- Transformation pipeline (if any)
- Destination and target table/item
- Sample code for Custom App sources
- Monitoring tips: check the Eventstream metrics pane for ingestion rates and errors
- Next steps: create a dashboard (`/rt-dashboard-create`) or set up alerts (`/data-activator-trigger`)
