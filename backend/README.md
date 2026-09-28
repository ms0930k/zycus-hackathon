# StockPulse Backend

StockPulse is a Merchandising / Inventory Intelligence Dashboard backend that helps manage product inventory, pricing, and reorder recommendations through AI-powered insights and human approval workflows.

## Tech Stack

- Java 17+
- Spring Boot 3.x
- Maven
- Spring Web
- Spring Data JPA
- Hibernate
- Jakarta Bean Validation
- PostgreSQL
- Neon PostgreSQL
- Spring Events
- `@Async`
- Jackson
- Lombok

## Architecture

The backend follows a clean architecture pattern with clear separation of concerns:

```
Controller Layer
    ↓
Service Layer
    ↓
Commerce Advisor (Rule-based / AI)
    ↓
Repository Layer
    ↓
Neon PostgreSQL
```

### Agentic Flow

```
Inventory/Demand Signal
    ↓
Spring Event
    ↓
@Async Listener
    ↓
CommerceAdvisor
    ↓
Suggestions
    ↓
Human Approval
```

## Setup

1. Make sure you have Java 17+ and Maven installed
2. Set up a Neon PostgreSQL database
3. Configure environment variables (see below)
4. Run the application:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows:
```bash
mvnw.cmd spring-boot:run
```

## Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL=jdbc:postgresql://<neon-host>/<database>?user=<username>&password=<password>&sslmode=require

LLM_API_KEY=<your-api-key>
LLM_PROVIDER=gemini
LLM_MODEL=<model-name>
```

## Configuration

The application can be configured through `application.yml`:

- `stockpulse.commerce.strategy`: Set to `RULE_BASED` or `AI`
- `stockpulse.demand.spikeMultiplier`: Multiplier for detecting demand spikes (default: 3.0)

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health/database check |
| POST | `/products` | Create product |
| GET | `/products` | List/filter products |
| PATCH | `/products/{id}/stock` | Update stock + trigger agent |
| POST | `/products/{id}/orders` | Simulate sale |
| POST | `/products/{id}/suggest-pricing` | Manual pricing suggestion |
| POST | `/products/{id}/suggest-reorder` | Manual reorder suggestion |
| PATCH | `/pricing-suggestions/{id}` | Accept/reject pricing |
| PATCH | `/reorder-suggestions/{id}` | Accept/reject reorder |

## Agentic Flows

### Inventory Low Trigger

When stock falls below reorder threshold:
1. Event is published
2. Async listener processes the event
3. Commerce advisor generates pricing and reorder suggestions
4. Suggestions await human approval

### Demand Spike Trigger

When demand velocity exceeds category average by specified multiplier:
1. Event is published
2. Async listener processes the event
3. Commerce advisor generates pricing and reorder suggestions
4. Suggestions await human approval

## Strategy Switching

The backend supports two commerce strategies:
- `RULE_BASED`: Uses built-in business rules
- `AI`: Uses LLM-based recommendations

Set the strategy in `application.yml`:
```yaml
stockpulse:
  commerce:
    strategy: RULE_BASED
```

## AI Fallback

When using AI strategy, if the LLM call fails or returns invalid data, the system automatically falls back to the rule-based strategy.

## Database

The application uses Neon PostgreSQL as the primary database. Tables are automatically created/updated on startup.

## Seed Data

The application automatically loads the following seeded products on first startup:
- PRD-001: Wireless Earbuds Pro
- PRD-002: USB-C Hub 7-Port
- PRD-003: Organic Cotton T-Shirt (PRICE_REVIEW_PENDING)
- PRD-004: Running Shorts - Navy
- PRD-005: Ceramic Pour-Over Set
- PRD-006: LED Desk Lamp - Dimmable (OUT_OF_STOCK)
- PRD-007: Portable Charger 20K
- PRD-008: Hoodie - Heather Grey

## Testing

Run tests with:
```bash
./mvnw test
```

## Demo Flow

1. Start the backend
2. Open the frontend dashboard
3. View products and their statuses
4. Simulate a sale to trigger agentic flows
5. Observe stock reduction and demand velocity increase
6. Check for async recommendations
7. Review pricing/reorder suggestions
8. Accept/reject recommendations
9. Observe product updates after approval