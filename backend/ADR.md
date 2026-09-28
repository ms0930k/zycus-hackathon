# Architecture Decision Records

## ADR-001: Where Commerce Logic Lives

### Context
We needed to decide where to implement the core commerce logic for pricing and reorder recommendations to ensure maintainability and extensibility.

### Options
1. Put all logic directly in services/controllers
2. Create a dedicated commerce layer with strategy pattern
3. Use a rules engine

### Decision
We chose to create a dedicated commerce layer with strategy pattern to allow easy switching between rule-based and AI-based approaches.

### Tradeoffs
- Pros: Clean separation of concerns, easy to extend with new strategies
- Cons: Slightly more complex initial setup

## ADR-002: Unified CommerceAdvisor Contract

### Context
We needed a consistent interface for both manual and automated (agentic) recommendation generation.

### Options
1. Separate interfaces for manual and automated recommendations
2. Single unified interface with context parameter
3. Direct integration in services

### Decision
We chose a single unified `CommerceAdvisor` interface with a context parameter to ensure consistency across all recommendation sources.

### Tradeoffs
- Pros: Consistent behavior, easier testing, reduced duplication
- Cons: Slightly more complex context object design

## ADR-003: Runtime Strategy Switching

### Context
We wanted to support different commerce strategies (rule-based vs AI) that can be switched at runtime without code changes.

### Options
1. Hard-coded conditional logic throughout the application
2. Strategy pattern with configuration-based selection
3. Profile-based Spring configuration

### Decision
We chose the strategy pattern with configuration-based selection to allow dynamic switching via environment variables.

### Tradeoffs
- Pros: No code changes needed, easy to add new strategies
- Cons: Slight overhead of abstraction layer

## ADR-004: LLM Failure Handling

### Context
When using AI-based recommendations, we needed to ensure the system remains functional even when LLM calls fail.

### Options
1. Fail the entire operation
2. Return default values
3. Fallback to rule-based strategy
4. Queue for retry

### Decision
We chose to fallback to the rule-based strategy immediately upon any AI failure to ensure continuous operation.

### Tradeoffs
- Pros: System remains functional, transparent to users
- Cons: May miss AI insights during outages

## ADR-005: Agentic Loop and Async Events

### Context
We needed to implement asynchronous processing for inventory and demand signals without blocking API responses.

### Options
1. Scheduled polling jobs
2. Synchronous processing in API calls
3. Spring Application Events with @Async

### Decision
We chose Spring Application Events with @Async to decouple signal detection from recommendation generation.

### Tradeoffs
- Pros: Non-blocking, event-driven, scalable
- Cons: Increased complexity of async flow management

## ADR-006: Human Approval Checkpoint

### Context
We needed to ensure that AI/rule recommendations don't automatically affect live prices/stock without human oversight.

### Options
1. Automatically apply recommendations
2. Require human approval for all recommendations
3. Auto-apply only for certain confidence levels

### Decision
We chose to require human approval for all recommendations to maintain control over merchandising decisions.

### Tradeoffs
- Pros: Full control, prevents unwanted changes, compliance
- Cons: Additional step in workflow, delayed effect of recommendations