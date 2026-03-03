# Azure AI Foundry Evaluations

## Overview

Azure AI Foundry provides built-in evaluators that measure agent output quality, safety, and groundedness. Run evaluations in the Foundry portal, via the SDK, or as part of CI/CD pipelines.

## Built-in Evaluators

### Quality Evaluators

| Evaluator | Class | Measures | Inputs Required |
|---|---|---|---|
| Relevance | `RelevanceEvaluator` | How relevant is the response to the query? | `query`, `response` |
| Groundedness | `GroundednessEvaluator` | Is the response grounded in the provided context? | `query`, `response`, `context` |
| Coherence | `CoherenceEvaluator` | Is the response logically consistent? | `query`, `response` |
| Fluency | `FluencyEvaluator` | Is the language natural and grammatically correct? | `response` |
| Similarity | `SimilarityEvaluator` | How similar is the response to the expected answer? | `response`, `ground_truth` |
| F1 Score | `F1ScoreEvaluator` | Token overlap between response and ground truth | `response`, `ground_truth` |

### Safety Evaluators (require Azure AI Content Safety connection)

| Evaluator | Class | Measures |
|---|---|---|
| Violence | `ViolenceEvaluator` | Violent content detection |
| Hate/Unfairness | `HateUnfairnessEvaluator` | Discriminatory or hateful content |
| Sexual Content | `SexualEvaluator` | Sexually explicit content |
| Self-Harm | `SelfHarmEvaluator` | Self-harm related content |
| Protected Material | `ProtectedMaterialEvaluator` | Copyright or IP violations |
| Indirect Attack | `IndirectAttackEvaluator` | Prompt injection via documents |

### RAG-Specific Evaluators

| Evaluator | Class | Measures |
|---|---|---|
| Retrieval | `RetrievalEvaluator` | Quality of document retrieval step |
| Groundedness Pro | `GroundednessProEvaluator` | Advanced groundedness using AI reasoning |

## Running Evaluations

### Basic Evaluation

```python
from azure.ai.evaluation import evaluate, RelevanceEvaluator, GroundednessEvaluator
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

# Configure the model used for AI-assisted evaluation
model_config = {
    "azure_endpoint": os.environ["AZURE_OPENAI_ENDPOINT"],
    "api_key": os.environ["AZURE_OPENAI_API_KEY"],
    "azure_deployment": "gpt-4o",
    "api_version": "2024-08-01-preview"
}

# Your evaluation dataset
data = [
    {
        "query": "What is the refund policy?",
        "response": "You can return items within 30 days for a full refund.",
        "context": "Our return policy allows returns within 30 days of purchase for a full refund."
    }
]

# Run the evaluation
result = evaluate(
    data=data,
    evaluators={
        "relevance": RelevanceEvaluator(model_config),
        "groundedness": GroundednessEvaluator(model_config)
    },
    azure_ai_project={
        "subscription_id": "<sub-id>",
        "resource_group_name": "<rg>",
        "project_name": "<project>"
    },
    output_path="./eval-results.json"
)

print(result["metrics"])
# Output: {"relevance.gpt_relevance": 4.5, "groundedness.gpt_groundedness": 5.0}
```

### Evaluating Agent Runs

Collect agent outputs into a dataset, then evaluate:

```python
# Collect outputs from af-test-agent conversations
eval_data = []
for test_case in test_cases:
    thread = client.agents.create_thread()
    client.agents.create_message(thread_id=thread.id, role="user", content=test_case["query"])
    run = client.agents.create_and_process_run(thread_id=thread.id, assistant_id=agent_id)
    messages = client.agents.list_messages(thread_id=thread.id)
    response = messages.data[0].content[0].text.value  # latest assistant message

    eval_data.append({
        "query": test_case["query"],
        "response": response,
        "context": test_case.get("context", ""),
        "ground_truth": test_case.get("expected", "")
    })

# Run evaluations on collected data
result = evaluate(data=eval_data, evaluators={"relevance": RelevanceEvaluator(model_config)})
```

### Safety Evaluation

```python
from azure.ai.evaluation import ViolenceEvaluator, HateUnfairnessEvaluator

azure_ai_project_config = {
    "subscription_id": "<sub-id>",
    "resource_group_name": "<rg>",
    "project_name": "<project>"
}

result = evaluate(
    data=data,
    evaluators={
        "violence": ViolenceEvaluator(azure_ai_project=azure_ai_project_config),
        "hate": HateUnfairnessEvaluator(azure_ai_project=azure_ai_project_config)
    }
)
```

## Evaluation Scores

Quality evaluators return scores on a 1–5 scale (via AI-assisted LLM scoring):
- **5**: Excellent
- **4**: Good
- **3**: Acceptable
- **2**: Poor
- **1**: Very poor

Safety evaluators return:
- `very_low`, `low`, `medium`, `high` severity
- `true`/`false` for binary detectors

## Viewing Results in Foundry Portal

When `azure_ai_project` is provided to `evaluate()`, results are automatically uploaded to the AI Foundry portal under **Evaluations** → **Your run name**.

Alternatively, point to an existing evaluation run:
```bash
az ml job show --name <eval-run-id> --workspace-name <project> --resource-group <rg>
```

## CI/CD Integration

Run evaluations as a quality gate in Azure DevOps or GitHub Actions:

```yaml
# Azure DevOps pipeline step
- script: |
    python scripts/run_eval.py
    python scripts/check_eval_thresholds.py --min-relevance 3.5 --max-violence low
  displayName: 'Run agent quality evaluation'
```

```python
# check_eval_thresholds.py
import json, sys

with open("eval-results.json") as f:
    results = json.load(f)

metrics = results["metrics"]
if metrics.get("relevance.gpt_relevance", 0) < 3.5:
    print("FAIL: Relevance score below threshold")
    sys.exit(1)

print("PASS: All quality thresholds met")
```
