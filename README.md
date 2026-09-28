# StockPulse — AI Inventory & Dynamic Pricing Engine

StockPulse is an intelligent merchandising and inventory intelligence engine that automates the detection of supply-demand imbalances, generates dynamic pricing and replenishment recommendations, and enforces a strict human-in-the-loop approval checkpoint before applying changes to production inventory.

---

## The Problem

Modern e-commerce and retail merchandising face critical operational challenges:
- **Manually Managed Pricing**: Pricing adjustments are slow, reactive, and often misaligned with real-time inventory fluctuations.
- **Real-Time Inventory Volatility**: Fast-moving stock, supply delays, and localized demand shifts require immediate reaction to avoid costly stockouts or margin erosion.
- **Demand Spikes & Low Stock Surges**: Sudden sales surges drain inventory before replenishment orders can be manually placed, leading to lost revenue and suboptimal price realization.
- **The StockPulse Solution**: StockPulse continuously monitors inventory and order velocity signals. When anomalies occur (e.g. low stock or demand surges), it orchestrates context gathering, computes AI or rule-based price and reorder recommendations, and stages them for merchandising approval.

---

## What the System Does

StockPulse operates on a clear, decoupled decision-and-control loop:

```
[Signal] ─────────► [Context Aggregation] ───► [Commerce Advisor]
(Stock / Order)      (Stock, Threshold,          (AI or Deterministic)
                      Velocity, Category Avg)            │
                                                         ▼
[Product State Update] ◄── [Human Approval] ◄── [Staged Recommendations]
(Price / Stock applied)     (Accept / Reject)   (Pricing & Reorder: PENDING)
```

### Core Execution Flow
1. **Signal Ingestion**: Stock changes (`PATCH /products/{id}/stock`) or order sales (`POST /products/{id}/orders`) trigger real-time evaluation.
2. **Event Detection**:
   - **Inventory-Low Trigger**: Fired when `stockLevel < reorderThreshold`.
   - **Demand-Spike Trigger**: Fired when `demandVelocity > categoryAverageDemandVelocity × spikeMultiplier` (default 3.0×).
3. **Asynchronous Recommendation Generation**: Decoupled from the HTTP request thread via Spring `@Async` events. Suggestions are calculated in the background without blocking the user.
4. **AI + Deterministic Fallback**: The active `CommerceAdvisor` evaluates the product context. If the AI model (LiteLLM / `qwen-cursor`) fails, times out, or returns out-of-bounds numbers, the engine instantly falls back to the deterministic `RuleBasedCommerceAdvisor`.
5. **Human Checkpoint**: Generated recommendations are persisted in a `PENDING` state. Nothing updates live prices or stock levels without explicit human approval.
6. **Product State Update**: Once an operator accepts a suggestion, the product price is updated (`currentPrice`) or replenished stock is incremented (`stockLevel`).

---

## Run with Docker (Recommended)

StockPulse is fully containerized and can be launched with a single Docker Compose command.

### Architecture in Docker

```
Browser (User)
      │
      ▼ (Port 80 / 5173)
Nginx Web Server / Static React SPA
      │
      │ (Internal reverse proxy: /products, /pricing-suggestions, etc.)
      ▼ (Port 8080)
Spring Boot Backend (Java 17/21 JRE)
      │
      ├──► PostgreSQL 16 Database (db:5432)
      │     (Internal Docker network, persistent pgdata volume)
      │
      └──► Zycus LiteLLM Gateway (External HTTPS)
            (Model: qwen-cursor, Bearer token, fallback to Rule engine)
```

### 1. Configure Environment
Copy the example environment template to `.env` in the project root:
```bash
cp .env.example .env
```
Fill in your LiteLLM credentials in `.env` (never commit this file):
```env
LLM_PROVIDER=litellm
LLM_BASE_URL=https://litellm-qc.zycus.net
LLM_API_KEY=your_actual_api_key_here
LLM_MODEL=qwen-cursor
STOCKPULSE_COMMERCE_STRATEGY=RULE_BASED
```
*(If `LLM_API_KEY` is not provided or offline, the system automatically uses `RuleBasedCommerceAdvisor` fallback).*

### 2. Start All Services
```bash
docker compose up --build
```
This builds and starts 3 coordinated containers:
1. `stockpulse-db`: PostgreSQL 16 database with health check (`pg_isready`).
2. `stockpulse-backend`: Spring Boot multi-stage image. Waits for `db` to be healthy, auto-generates schema, and seeds all 8 demo products.
3. `stockpulse-frontend`: Multi-stage build (Node build $\rightarrow$ lightweight Nginx Alpine). Proxies API traffic to backend on the same origin.

### 3. Access the Application
- **Frontend Dashboard**: Open [http://localhost](http://localhost) or [http://localhost:5173](http://localhost:5173)
- **Backend Health Check**: [http://localhost:8080/health](http://localhost:8080/health)
- **Product Catalog API**: [http://localhost:8080/products](http://localhost:8080/products)

### 4. Stop Services
```bash
# Stop containers while preserving database volume
docker compose down

# Stop containers and remove database volume
docker compose down -v
```

---

## Database Configuration: Local Docker vs. Neon Production

| Mode | Database | Connection String / Configuration | Characteristics |
|------|----------|-----------------------------------|-----------------|
| **Docker Compose (Default)** | PostgreSQL 16 Alpine container (`stockpulse-db`) | `jdbc:postgresql://db:5432/stockpulse?user=stockpulse&password=stockpulse` | Zero-dependency, self-contained, isolated local Docker network, persistent named volume `pgdata`. |
| **Local Dev (Non-Docker)** | In-Memory H2 Database | Embedded via `-Dspring-boot.run.profiles=local` | Ultra-fast local development and testing without installing PostgreSQL. |
| **External Production (Neon)** | Serverless Neon PostgreSQL | `jdbc:postgresql://<neon-host>:5432/<db>?user=<user>&password=<pass>&sslmode=require` | Managed cloud PostgreSQL. Configured via `DATABASE_URL` environment variable. |

> [!NOTE]
> Neon PostgreSQL cloud connectivity requires outbound network access on port 5432. For local evaluation and testing in firewalled or sandbox environments, use the self-contained Docker Compose PostgreSQL setup or the local H2 profile.

---

## Core Technologies

| Component | Technology | Version / Details |
|-----------|------------|-------------------|
| **Backend Framework** | Spring Boot | `3.1.5` |
| **Language** | Java | `17+` (compatible with Java 17 and Java 21) |
| **Build Tool** | Apache Maven | `3.9+` |
| **Persistence** | Spring Data JPA / Hibernate | Object-Relational Mapping & Transactions |
| **Production Database** | PostgreSQL / Neon | Cloud serverless PostgreSQL with SSL |
| **Local Container Database** | PostgreSQL 16 Alpine | Containerized inside Docker Compose |
| **Local In-Memory Profile** | H2 Database | In-memory profile (`-Dspring-boot.run.profiles=local`) |
| **Frontend Framework** | React | `18.3.1` |
| **Frontend Language** | TypeScript | `5.6.2` |
| **Build & Bundler** | Vite | `5.4.14` |
| **Production Web Server** | Nginx Alpine | Serves static assets & reverse proxies API endpoints |
| **Styling** | Vanilla CSS | Custom design tokens, dark theme, responsive grid |
| **AI LLM Gateway** | LiteLLM | Model `qwen-cursor` with structured JSON responses |
| **JSON Serialization** | Jackson Databind | Clean JSON schema mapping and validation |

---

## Business Logic Overview

### Deterministic Rule Engine (`RuleBasedCommerceAdvisor`)
When running under the `RULE_BASED` strategy, or whenever the AI advisor triggers its fallback mechanism, recommendations follow exact deterministic formulas:

#### Dynamic Pricing Rules
1. **Low Stock Condition** (`stockLevel < reorderThreshold`):
   - **Action**: Price increased by **+10%** (`currentPrice × 1.10`)
   - **Direction**: `INCREASE`
   - **Confidence**: `0.9`
   - **Reasoning**: Protects remaining scarce inventory and moderates depletion rate.
2. **Demand Spike Condition** (`demandVelocity > 2 × categoryAverageDemandVelocity`):
   - **Action**: Price increased by **+5%** (`currentPrice × 1.05`)
   - **Direction**: `INCREASE`
   - **Confidence**: `0.8`
   - **Reasoning**: Modest price adjustment capitalizing on elevated demand velocity while balancing supply.
3. **Normal / Stable Condition**:
   - **Action**: Price held unchanged (`currentPrice`)
   - **Direction**: `HOLD`
   - **Confidence**: `0.7`
   - **Reasoning**: Stable demand and adequate stock levels; no price adjustment needed.

#### Reorder Quantity Formula
$$\text{Recommended Quantity} = \max(1, (\text{reorderThreshold} \times 3) - \text{currentStock})$$
- **Lead Time**: 7 days
- **Confidence**: `0.85`

### AI Commerce Advisor (`AiCommerceAdvisor`)
When the `AI` strategy is enabled:
- Constructs rich prompts detailing product name, category, current price, stock levels, threshold, demand velocity, and category average demand.
- Solicits structured JSON recommendations from `qwen-cursor` with natural language merchandising reasoning.
- Validates that recommended prices remain within reasonable bounds (50% to 150% of current price).
- If validation fails, or if network/API errors occur, it seamlessly falls back to `RuleBasedCommerceAdvisor` without interrupting service.

---

## Agentic Loop & Idempotency

The autonomous agent loop guarantees timely recommendations while protecting against redundant executions:

```
Stock Mutation / Sale Simulation
             │
             ▼
Check threshold & spike condition
             │
             ▼
Publish InventoryLowEvent or DemandSpikeEvent
             │
             ▼
AgentEventListener (@Async, Async-Executor thread pool)
             │
             ▼
Deduplication Check:
Is there already a PENDING suggestion for this Product + TriggerReason?
     ├── YES ──► Log duplicate & exit gracefully (Idempotent)
     └── NO  ──► Generate Context ──► CommerceAdvisor ──► Save PENDING Suggestions
```

- **Asynchronous Execution**: Handled via Spring's `ThreadPoolTaskExecutor` (`corePoolSize=4`, `maxPoolSize=10`, `queueCapacity=100`).
- **Idempotency**: `AgenticRecommendationService` checks for existing `PENDING` suggestions with the matching `TriggerReason`. Repeated orders will not flood the merchandiser with duplicate suggestion cards.

---

## Evaluator Quick Walkthrough (Demo Flow)

Follow these steps for a complete evaluation:

### Step 1: Start Application
Run with Docker:
```bash
docker compose up --build
```
Or run locally:
```powershell
# Terminal 1: Backend
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=local"

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Step 2: Open Dashboard
Navigate to [http://localhost](http://localhost) (or [http://localhost:5173](http://localhost:5173)).

### Step 3: Run the Inventory-Low Demo (`PRD-003`)
1. On the dashboard, locate seeded product **PRD-003** (*Organic Cotton T-Shirt*).
2. Note that its stock level is `8` with a threshold of `15`.
3. In the input box next to "Set Stock", enter `5` and click **Set Stock** (or click **🛒 Simulate Sale**).
4. Within 2–4 seconds, the asynchronous agent detects low inventory and creates:
   - **💡 Pricing Suggestion**: Recommends increasing the price by +10% (from $24.99 to $27.49) with trigger `INVENTORY_LOW`.
   - **📦 Reorder Suggestion**: Recommends replenishment quantity (`+40` units).
5. Click **Accept** on the pricing suggestion.
6. Observe that the product's live price instantly updates to **$27.49** and the card badge updates.

### Step 4: Run the Demand-Spike Demo (`PRD-008`)
1. Locate seeded product **PRD-008** (*Hoodie - Heather Grey*).
2. Its current demand velocity is high (`15.0/day`), and stock is `11` (threshold `12`).
3. Click **🛒 Simulate Sale**.
4. The sale decrements stock and increments demand velocity to `16.0/day`, triggering both low inventory and a demand spike relative to the apparel category average.
5. Watch the asynchronous agent stage new pending suggestions with full reasoning.
6. Accept or Reject either suggestion and verify the immediate dashboard update.

---

## Project Structure

```
zycus-hackathon/
├── README.md                      # Root documentation & architecture overview
├── docker-compose.yml             # Docker Compose for DB, Backend, and Frontend
├── .env.example                   # Root environment variable template
├── .gitignore                     # Git ignore rules for secrets, builds, and artifacts
├── backend/                       # Spring Boot 3.1.5 backend service
│   ├── Dockerfile                 # Multi-stage Dockerfile (Maven build -> JRE runtime)
│   ├── .dockerignore              # Excludes secrets, target, and logs from Docker context
│   ├── pom.xml                    # Maven build configuration & dependencies
│   ├── ADR.md                     # Architecture Decision Records (ADR-001 - ADR-006)
│   ├── .env.example               # Example environment variable template
│   ├── .gitignore                 # Backend-specific ignore rules
│   ├── src/
│   │   └── main/
│   │       ├── java/com/stockpulse/
│   │       │   ├── agent/         # Event bus, @Async listeners, AgenticRecommendationService
│   │       │   ├── ai/            # LiteLLM client (qwen-cursor), MockLlmClient, LlmClient interface
│   │       │   ├── commerce/      # CommerceAdvisor strategy, RuleBased & AI implementations, Category analytics
│   │       │   ├── common/        # GlobalExceptionHandler, HealthController, Enums
│   │       │   ├── config/        # ThreadPool AsyncConfig, CorsConfig, StrategyConfig
│   │       │   ├── pricing/       # PricingSuggestion entity, repository, service, controller
│   │       │   ├── product/       # Product entity, repository, service, controller
│   │       │   ├── reorder/       # ReorderSuggestion entity, repository, service, controller
│   │       │   └── seed/          # SeedDataLoader initializing the 8 demo catalog products
│   │       └── resources/
│   │           ├── application.yml        # Default production / PostgreSQL configuration
│   │           └── application-local.yml  # Local H2 development profile
└── frontend/                      # React 18 + TypeScript + Vite merchandising dashboard
    ├── Dockerfile                 # Multi-stage Dockerfile (Node build -> Nginx runtime)
    ├── nginx.conf                 # Nginx SPA fallback & backend API reverse proxy
    ├── .dockerignore              # Excludes node_modules and dist from Docker context
    ├── .gitignore                 # Frontend-specific ignore rules
    ├── package.json               # Frontend dependencies & scripts
    ├── vite.config.ts             # Vite configuration
    ├── src/
    │   ├── App.tsx                # Single-page dashboard, state, card grid, polling loop
    │   ├── api.ts                 # Centralized REST API fetch utilities (configurable VITE_API_URL)
    │   ├── types.ts               # TypeScript interfaces for Product, Suggestions
    │   ├── index.css              # Custom styling, dark mode design system, badges
    │   └── main.tsx               # Application root bootstrap
```

---

## Detailed Documentation Links

- **Backend Deep Dive**: [backend/README.md](file:///c:/Users/poweroot/Desktop/zycus-hackathon/zycus-hackathon/backend/README.md)
- **Frontend Deep Dive**: [frontend/README.md](file:///c:/Users/poweroot/Desktop/zycus-hackathon/zycus-hackathon/frontend/README.md)
- **Architecture Decision Records**: [backend/ADR.md](file:///c:/Users/poweroot/Desktop/zycus-hackathon/zycus-hackathon/backend/ADR.md)
