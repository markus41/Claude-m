# Metadata and Content-Type Operations — C# Implementation

---

## Categorization Rules Model

```csharp
public record CategoryRule(
    string Name,
    RuleMatch Match,
    Dictionary<string, string> Apply);

public record RuleMatch(
    string[]? Extensions = null,
    string[]? PathContains = null,
    string[]? NameContains = null,
    string? NameRegex = null,
    long? SizeMbGt = null,
    DateTimeOffset? ModifiedBefore = null);
```

---

## Rule Matching Engine

```csharp
public class CategorizationEngine(IReadOnlyList<CategoryRule> rules)
{
    private readonly IReadOnlyList<(CategoryRule Rule, Regex? CompiledRegex)> _compiled =
        rules.Select(r => (r, r.Match.NameRegex is not null
            ? new Regex(r.Match.NameRegex, RegexOptions.IgnoreCase | RegexOptions.Compiled)
            : (Regex?)null)).ToList();

    public CategoryRule? Match(FileInventoryRecord file)
    {
        foreach (var (rule, regex) in _compiled)
        {
            var m = rule.Match;

            if (m.Extensions?.Length > 0 &&
                !m.Extensions.Any(e => file.Extension.Equals(e, StringComparison.OrdinalIgnoreCase)))
                continue;

            if (m.PathContains?.Length > 0 &&
                !m.PathContains.Any(p => file.ParentPath.Contains(p, StringComparison.OrdinalIgnoreCase)))
                continue;

            if (m.NameContains?.Length > 0 &&
                !m.NameContains.Any(n => file.Name.Contains(n, StringComparison.OrdinalIgnoreCase)))
                continue;

            if (regex is not null && !regex.IsMatch(file.Name))
                continue;

            if (m.SizeMbGt.HasValue && file.SizeMb <= m.SizeMbGt.Value)
                continue;

            if (m.ModifiedBefore.HasValue && file.LastModifiedDateTime >= m.ModifiedBefore.Value)
                continue;

            return rule; // first match wins
        }

        return null;
    }
}
```

---

## Graph Metadata PATCH Service

```csharp
public class MetadataService(
    GraphServiceClient graphClient,
    ResiliencePipeline<object> pipeline,
    ILogger<MetadataService> logger)
{
    // Single item update
    public async Task UpdateFieldsAsync(
        string siteId,
        string listId,
        string itemId,
        Dictionary<string, object> fields,
        CancellationToken ct = default)
    {
        var update = new FieldValueSet { AdditionalData = fields };
        await pipeline.ExecuteAsync(async ct2 =>
        {
            await graphClient.Sites[siteId].Lists[listId].Items[itemId].Fields
                .PatchAsync(update, cancellationToken: ct2);
            return 0;
        }, ct);
    }

    // Batch update — up to 20 per batch
    public async Task<BatchUpdateResult> BatchUpdateFieldsAsync(
        string siteId,
        string listId,
        IReadOnlyList<(string ItemId, Dictionary<string, object> Fields)> updates,
        bool dryRun = false,
        CancellationToken ct = default)
    {
        var succeeded = 0;
        var failed = new List<string>();

        // Chunk into groups of 20
        foreach (var chunk in updates.Chunk(20))
        {
            if (dryRun)
            {
                foreach (var (itemId, fields) in chunk)
                    logger.LogInformation("[DRY RUN] Would patch {itemId}: {fields}",
                        itemId, string.Join(", ", fields.Select(kv => $"{kv.Key}={kv.Value}")));
                succeeded += chunk.Length;
                continue;
            }

            var batch = new BatchRequestContentCollection(graphClient);
            var idMap = new Dictionary<string, string>(); // batchId → itemId

            foreach (var (itemId, fields) in chunk)
            {
                var update = new FieldValueSet { AdditionalData = fields };
                var req = graphClient.Sites[siteId].Lists[listId].Items[itemId].Fields
                    .ToPatchRequestInformation(update);
                var batchId = await batch.AddBatchRequestStepAsync(req);
                idMap[batchId] = itemId;
            }

            try
            {
                var response = await pipeline.ExecuteAsync(async ct2 =>
                    await graphClient.Batch.PostAsync(batch, ct2), ct);

                foreach (var (batchId, itemId) in idMap)
                {
                    try
                    {
                        await response.GetResponseByIdAsync<FieldValueSet>(batchId);
                        succeeded++;
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Batch item {itemId} failed", itemId);
                        failed.Add(itemId);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Batch request failed");
                failed.AddRange(chunk.Select(c => c.ItemId));
            }
        }

        return new BatchUpdateResult(succeeded, failed);
    }
}

public record BatchUpdateResult(int Succeeded, IReadOnlyList<string> FailedItemIds);
```

---

## Content-Type Assignment

```csharp
// List content types in a site
var contentTypes = await graphClient.Sites[siteId].ContentTypes
    .GetAsync(cfg => cfg.QueryParameters.Select = ["id", "name", "isBuiltIn"]);

// Find a content type by name
var contractType = contentTypes?.Value?
    .FirstOrDefault(ct => ct.Name == "Contract");

// Assign to a list item
var update = new ListItem
{
    ContentType = new ContentTypeInfo { Id = contractType?.Id }
};

await graphClient.Sites[siteId].Lists[listId].Items[itemId]
    .PatchAsync(update);
```

---

## Term Store Lookup for Managed Metadata

```csharp
public class TermStoreService(GraphServiceClient graphClient)
{
    // Cache: label → TermGuid
    private readonly ConcurrentDictionary<string, string?> _cache = new();

    public async Task<string?> FindTermGuidAsync(
        string siteId,
        string setId,
        string label,
        CancellationToken ct = default)
    {
        var cacheKey = $"{setId}:{label.ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out var cached)) return cached;

        var terms = await graphClient.Sites[siteId].TermStore.Sets[setId].Terms
            .GetAsync(cfg => cfg.QueryParameters.Select = ["id", "labels"], ct);

        var term = terms?.Value?
            .FirstOrDefault(t => t.Labels?
                .Any(l => l.Name?.Equals(label, StringComparison.OrdinalIgnoreCase) == true) == true);

        var guid = term?.Id;
        _cache[cacheKey] = guid;
        return guid;
    }
}

// Usage: writing a managed metadata field
var termGuid = await termStore.FindTermGuidAsync(siteId, setId, "Finance");
var fields = new Dictionary<string, object>
{
    // Managed metadata: {ColumnName} = "Label|TermGuid", {ColumnName}LookupId = "-1"
    { "DepartmentLookupId", "-1" },
    { "Department", $"Finance|{termGuid}" }
};
```

---

## Apply-Categories Orchestration

```csharp
public class ApplyCategoriesService(
    CategorizationEngine engine,
    MetadataService metadataService,
    ILogger<ApplyCategoriesService> logger)
{
    public async Task<ApplyResult> ApplyAsync(
        string siteId,
        string listId,
        IReadOnlyList<FileInventoryRecord> inventory,
        bool dryRun = true,
        CancellationToken ct = default)
    {
        // Match each file to a rule
        var matches = inventory
            .Select(file => (File: file, Rule: engine.Match(file)))
            .Where(x => x.Rule is not null)
            .ToList();

        logger.LogInformation("Matched {count}/{total} files to categorization rules",
            matches.Count, inventory.Count);

        if (dryRun)
        {
            foreach (var (file, rule) in matches)
                logger.LogInformation("[DRY RUN] {path} → rule '{rule}'",
                    file.FullPath, rule!.Name);

            return new ApplyResult(0, [], matches.Count, dryRun: true);
        }

        // Build update list
        var updates = matches
            .Select(x => (
                x.File.Id,
                x.Rule!.Apply.ToDictionary(kv => kv.Key, kv => (object)kv.Value)))
            .ToList();

        var result = await metadataService.BatchUpdateFieldsAsync(
            siteId, listId, updates, dryRun: false, ct);

        return new ApplyResult(
            result.Succeeded,
            result.FailedItemIds,
            inventory.Count - matches.Count,
            dryRun: false);
    }
}

public record ApplyResult(
    int Succeeded,
    IReadOnlyList<string> Failed,
    int Unmatched,
    bool DryRun);
```
