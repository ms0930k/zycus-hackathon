package com.stockpulse.commerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockpulse.ai.LlmClient;
import com.stockpulse.pricing.Direction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class AiCommerceAdvisor implements CommerceAdvisor {

    private static final Logger logger = LoggerFactory.getLogger(AiCommerceAdvisor.class);

    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;
    private final RuleBasedCommerceAdvisor ruleBasedCommerceAdvisor;

    public AiCommerceAdvisor(LlmClient llmClient, ObjectMapper objectMapper, RuleBasedCommerceAdvisor ruleBasedCommerceAdvisor) {
        this.llmClient = llmClient;
        this.objectMapper = objectMapper;
        this.ruleBasedCommerceAdvisor = ruleBasedCommerceAdvisor;
    }

    @Override
    public CommerceRecommendation recommend(ProductContext context) {
        try {
            String prompt = createPrompt(context);
            logger.info("[AI] Calling LLM with trigger context: {}", context.getTriggerContext());

            String response = llmClient.callLlm(prompt);
            logger.debug("[AI] Raw LLM response: {}", response);

            if (response != null && !response.isBlank()) {
                String cleanJson = stripMarkdown(response);
                JsonNode root = objectMapper.readTree(cleanJson);
                
                CommerceRecommendation rec = new CommerceRecommendation();
                if (root.has("recommendedPrice")) {
                    rec.setRecommendedPrice(root.get("recommendedPrice").asDouble());
                }
                if (root.has("direction")) {
                    rec.setPriceDirection(Direction.valueOf(root.get("direction").asText().toUpperCase()));
                }
                if (root.has("confidence")) {
                    rec.setPriceConfidence(root.get("confidence").asDouble());
                }
                if (root.has("pricingReasoning") && root.has("reasoning")) {
                    rec.setPriceReasoning(root.get("pricingReasoning").asText());
                } else if (root.has("reasoning")) {
                    rec.setPriceReasoning(root.get("reasoning").asText());
                } else if (root.has("pricingReasoning")) {
                    rec.setPriceReasoning(root.get("pricingReasoning").asText());
                }
                
                if (root.has("recommendedQuantity")) {
                    rec.setRecommendedQuantity(root.get("recommendedQuantity").asInt());
                }
                if (root.has("reorderConfidence")) {
                    rec.setReorderConfidence(root.get("reorderConfidence").asDouble());
                }
                if (root.has("reorderReasoning")) {
                    rec.setReorderReasoning(root.get("reorderReasoning").asText());
                }
                if (root.has("suggestedLeadTimeDays")) {
                    rec.setSuggestedLeadTimeDays(root.get("suggestedLeadTimeDays").asInt());
                }

                validateRecommendation(rec, context);

                return rec;
            }
        } catch (Exception e) {
            logger.error("[AI] Failed to get recommendation from LLM or validation failed: {}", e.getMessage(), e);
        }
        
        logger.info("[AI] Falling back to rule-based recommendation");
        return ruleBasedCommerceAdvisor.recommend(context);
    }
    
    private void validateRecommendation(CommerceRecommendation rec, ProductContext context) {
        // Validate price
        if (rec.getRecommendedPrice() <= 0) {
            throw new IllegalArgumentException("Recommended price must be positive");
        }
        
        // Guard against extreme price changes
        if (rec.getRecommendedPrice() > context.getCurrentPrice() * 3 || 
            rec.getRecommendedPrice() < context.getCurrentPrice() * 0.3) {
            throw new IllegalArgumentException("Recommended price outside reasonable bounds");
        }
        
        // Validate quantity
        if (rec.getRecommendedQuantity() <= 0) {
            throw new IllegalArgumentException("Recommended quantity must be positive");
        }
        
        // Validate confidence
        if (rec.getPriceConfidence() < 0 || rec.getPriceConfidence() > 1) {
            throw new IllegalArgumentException("Price confidence must be between 0 and 1");
        }
        
        if (rec.getReorderConfidence() < 0 || rec.getReorderConfidence() > 1) {
            throw new IllegalArgumentException("Reorder confidence must be between 0 and 1");
        }
        
        // Validate direction
        if (rec.getPriceDirection() == null) {
            throw new IllegalArgumentException("Price direction must be specified");
        }
        
        // Validate reasoning
        if (rec.getPriceReasoning() == null || rec.getPriceReasoning().trim().isEmpty()) {
            throw new IllegalArgumentException("Price reasoning must not be empty");
        }
        
        if (rec.getReorderReasoning() == null || rec.getReorderReasoning().trim().isEmpty()) {
            throw new IllegalArgumentException("Reorder reasoning must not be empty");
        }
    }
    
    private String stripMarkdown(String response) {
        String clean = response.trim();
        if (clean.startsWith("```json")) {
            clean = clean.substring("```json".length());
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        return clean.trim();
    }

    private String createPrompt(ProductContext context) {
        if ("INVENTORY_LOW".equals(context.getTriggerContext())) {
            return createInventoryLowPrompt(context);
        } else if ("DEMAND_SPIKE".equals(context.getTriggerContext())) {
            return createDemandSpikePrompt(context);
        } else {
            return createManualPrompt(context);
        }
    }

    private String createInventoryLowPrompt(ProductContext context) {
        double velocityRatio = context.getCategoryAverageDemandVelocity() > 0 ? 
            context.getDemandVelocity() / context.getCategoryAverageDemandVelocity() : 0;
            
        String demandAssessment;
        if (velocityRatio < 0.5) {
            demandAssessment = "below category average";
        } else if (velocityRatio < 1.5) {
            demandAssessment = "near category average";
        } else if (velocityRatio < 3.0) {
            demandAssessment = "moderately above average";
        } else {
            demandAssessment = "significantly above average";
        }
        
        return String.format("""
                You are a retail merchandising decision engine. Analyze this inventory-low situation with commercial realism.
                
                Product: %s
                Category: %s
                Current Price: $%.2f
                Current Stock: %d units
                Reorder Threshold: %d units
                Demand Velocity: %.2f units/day
                Category Average Demand: %.2f units/day
                Relative Demand: %s (velocity / category avg = %.2f)
                
                INVENTORY PRESSURE:
                Stock is %d%% of reorder threshold. This represents %s inventory pressure.
                
                COMMERCIAL ANALYSIS:
                - Stockout risk: %s
                - Scarcity value: %s
                - Sell-through vs protection tradeoff: %s
                
                PRICING DECISION FACTORS:
                1. Demand pressure: %s
                2. Inventory pressure: %s
                3. Interaction effects: %s
                
                REORDER DECISION FACTORS:
                1. Current stock depletion rate
                2. Replenishment urgency
                3. Stockout impact mitigation
                
                INSTRUCTIONS:
                1. Recommend a price adjustment considering the commercial reality
                2. Choose INCREASE, DECREASE, or HOLD
                3. Rate confidence (0.0 to 1.0)
                4. Explain your pricing reasoning
                5. Recommend a reorder quantity
                6. Rate reorder confidence
                7. Explain your reorder reasoning
                8. Suggest lead time in days
                
                CONSTRAINTS:
                - Price must be positive and reasonable (generally within 30%%-300%% of current price)
                - Modest changes preferred unless strongly justified
                - Reorder quantity should be positive integer
                - Do not invent unavailable data (no competitor prices, margins, etc.)
                
                Respond ONLY with valid JSON in this format:
                {
                  "recommendedPrice": 87.99,
                  "direction": "INCREASE",
                  "confidence": 0.86,
                  "pricingReasoning": "Stockout risk is elevated because inventory is below threshold while demand is healthy...",
                  "recommendedQuantity": 52,
                  "reorderConfidence": 0.91,
                  "reorderReasoning": "To restore adequate stock levels considering current demand velocity...",
                  "suggestedLeadTimeDays": 7
                }
                """, 
                context.getProductName(),
                context.getCategory(),
                context.getCurrentPrice(),
                context.getCurrentStock(),
                context.getReorderThreshold(),
                context.getDemandVelocity(),
                context.getCategoryAverageDemandVelocity(),
                demandAssessment,
                velocityRatio,
                Math.round((double) context.getCurrentStock() / context.getReorderThreshold() * 100),
                context.getCurrentStock() < context.getReorderThreshold() ? "HIGH" : "LOW",
                context.getCurrentStock() < context.getReorderThreshold() ? "ELEVATED" : "LOW",
                context.getCurrentStock() < context.getReorderThreshold() ? "SIGNIFICANT" : "MINIMAL",
                context.getCurrentStock() < context.getReorderThreshold() ? "CRITICAL" : "MANAGEABLE",
                demandAssessment,
                context.getCurrentStock() < context.getReorderThreshold() ? "HIGH" : "LOW",
                (context.getCurrentStock() < context.getReorderThreshold() && velocityRatio > 1.0) ? 
                    "HIGH DEMAND + LOW STOCK: PROTECT INVENTORY" : 
                    (context.getCurrentStock() < context.getReorderThreshold() && velocityRatio < 1.0) ? 
                        "LOW DEMAND + LOW STOCK: CONSIDER CLEARANCE" : "NORMAL CONDITIONS"
        );
    }

    private String createDemandSpikePrompt(ProductContext context) {
        double velocityRatio = context.getCategoryAverageDemandVelocity() > 0 ? 
            context.getDemandVelocity() / context.getCategoryAverageDemandVelocity() : 0;
            
        String demandAssessment;
        if (velocityRatio < 0.5) {
            demandAssessment = "below category average";
        } else if (velocityRatio < 1.5) {
            demandAssessment = "near category average";
        } else if (velocityRatio < 3.0) {
            demandAssessment = "moderately above average";
        } else {
            demandAssessment = "significantly above average";
        }
        
        return String.format("""
                You are a retail merchandising decision engine. Analyze this demand spike situation with commercial realism.
                
                Product: %s
                Category: %s
                Current Price: $%.2f
                Current Stock: %d units
                Reorder Threshold: %d units
                Demand Velocity: %.2f units/day
                Category Average Demand: %.2f units/day
                Relative Demand: %s (velocity / category avg = %.2f)
                
                DEMAND ACCELERATION:
                Demand is %.1fx the category average. This represents %s demand pressure.
                
                INVENTORY HEALTH:
                Stock is %d%% of reorder threshold. Inventory status is %s.
                
                COMMERCIAL ANALYSIS:
                - Price-value balance: %s
                - Revenue opportunity: %s
                - Stock depletion risk: %s
                
                PRICING DECISION FACTORS:
                1. Demand acceleration strength: %s
                2. Inventory adequacy: %s
                3. Value capture opportunity: %s
                
                REORDER DECISION FACTORS:
                1. Accelerating demand impact on stock
                2. Replenishment timing urgency
                3. Future stockout risk mitigation
                
                INSTRUCTIONS:
                1. Recommend a price adjustment considering commercial reality
                2. Choose INCREASE, DECREASE, or HOLD
                3. Rate confidence (0.0 to 1.0)
                4. Explain your pricing reasoning
                5. Recommend a reorder quantity
                6. Rate reorder confidence
                7. Explain your reorder reasoning
                8. Suggest lead time in days
                
                CONSTRAINTS:
                - Price must be positive and reasonable (generally within 30%%-300%% of current price)
                - Modest changes preferred unless strongly justified
                - Reorder quantity should be positive integer
                - Do not invent unavailable data (no competitor prices, margins, etc.)
                
                Respond ONLY with valid JSON in this format:
                {
                  "recommendedPrice": 87.99,
                  "direction": "INCREASE",
                  "confidence": 0.86,
                  "pricingReasoning": "Demand acceleration is significant while inventory is adequate. A modest increase captures value without risking stockouts...",
                  "recommendedQuantity": 52,
                  "reorderConfidence": 0.91,
                  "reorderReasoning": "Accelerating demand requires proactive replenishment to maintain service levels...",
                  "suggestedLeadTimeDays": 7
                }
                """, 
                context.getProductName(),
                context.getCategory(),
                context.getCurrentPrice(),
                context.getCurrentStock(),
                context.getReorderThreshold(),
                context.getDemandVelocity(),
                context.getCategoryAverageDemandVelocity(),
                demandAssessment,
                velocityRatio,
                velocityRatio,
                demandAssessment,
                Math.round((double) context.getCurrentStock() / context.getReorderThreshold() * 100),
                context.getCurrentStock() < context.getReorderThreshold() ? "BELOW THRESHOLD" : "ADEQUATE",
                (velocityRatio > 2.0 && context.getCurrentStock() > context.getReorderThreshold()) ? 
                    "FAVORABLE FOR MODERATE INCREASE" : "REQUIRES CAUTION",
                (velocityRatio > 2.0) ? "STRONG" : "MODERATE",
                context.getCurrentStock() < context.getReorderThreshold() ? "ELEVATED" : "MANAGEABLE",
                demandAssessment,
                context.getCurrentStock() > context.getReorderThreshold() ? "ADEQUATE" : "INSUFFICIENT",
                (velocityRatio > 2.0 && context.getCurrentStock() > context.getReorderThreshold()) ? 
                    "SIGNIFICANT" : (velocityRatio > 1.5 ? "MODERATE" : "LIMITED")
        );
    }

    private String createManualPrompt(ProductContext context) {
        double velocityRatio = context.getCategoryAverageDemandVelocity() > 0 ? 
            context.getDemandVelocity() / context.getCategoryAverageDemandVelocity() : 0;
            
        String demandAssessment;
        if (velocityRatio < 0.5) {
            demandAssessment = "below category average";
        } else if (velocityRatio < 1.5) {
            demandAssessment = "near category average";
        } else if (velocityRatio < 3.0) {
            demandAssessment = "moderately above average";
        } else {
            demandAssessment = "significantly above average";
        }
        
        return String.format("""
                You are a retail merchandising decision engine. Provide a comprehensive commercial assessment.
                
                Product: %s
                Category: %s
                Current Price: $%.2f
                Current Stock: %d units
                Reorder Threshold: %d units
                Demand Velocity: %.2f units/day
                Category Average Demand: %.2f units/day
                Relative Demand: %s (velocity / category avg = %.2f)
                
                CONTEXTUAL ANALYSIS:
                - Demand pressure: %s
                - Inventory health: %s%% of threshold
                - Commercial positioning: %s
                
                COMPREHENSIVE FACTORS:
                1. Demand-inventory interaction dynamics
                2. Price-value equilibrium
                3. Revenue optimization opportunities
                4. Service level maintenance
                5. Risk-benefit tradeoff assessment
                
                INSTRUCTIONS:
                1. Recommend optimal pricing strategy
                2. Choose INCREASE, DECREASE, or HOLD
                3. Rate confidence with evidence justification
                4. Provide detailed pricing rationale
                5. Recommend strategic reorder quantity
                6. Rate reorder confidence
                7. Provide detailed replenishment rationale
                8. Recommend appropriate lead time
                
                CONSTRAINTS:
                - Evidence-based recommendations only
                - Price changes must be commercially justified (generally within 30%%-300%% of current price)
                - Reorder quantities must be inventory-aligned
                - Never assume unavailable data (no competitor prices, margins, etc.)
                
                Respond ONLY with valid JSON in this format:
                {
                  "recommendedPrice": 87.99,
                  "direction": "INCREASE",
                  "confidence": 0.86,
                  "pricingReasoning": "Balanced assessment of demand strength and inventory position suggests a measured approach...",
                  "recommendedQuantity": 52,
                  "reorderConfidence": 0.91,
                  "reorderReasoning": "Strategic replenishment aligned with demand patterns and service objectives...",
                  "suggestedLeadTimeDays": 7
                }
                """, 
                context.getProductName(),
                context.getCategory(),
                context.getCurrentPrice(),
                context.getCurrentStock(),
                context.getReorderThreshold(),
                context.getDemandVelocity(),
                context.getCategoryAverageDemandVelocity(),
                demandAssessment,
                velocityRatio,
                demandAssessment,
                Math.round((double) context.getCurrentStock() / context.getReorderThreshold() * 100),
                context.getCurrentStock() < context.getReorderThreshold() ? 
                    "CHALLENGED" : (velocityRatio > 2.0 ? "OPPORTUNITY-RICH" : "STABLE")
        );
    }
}