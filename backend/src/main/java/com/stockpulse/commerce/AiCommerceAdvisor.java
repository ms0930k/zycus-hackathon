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
        if (rec.getRecommendedPrice() <= 0) {
            throw new IllegalArgumentException("Recommended price must be greater than 0");
        }
        
        double currentPrice = context.getCurrentPrice();
        if (rec.getRecommendedPrice() < currentPrice * 0.5 || rec.getRecommendedPrice() > currentPrice * 1.5) {
            throw new IllegalArgumentException("Recommended price is outside reasonable bounds (50% to 150% of current price)");
        }
        
        if (rec.getPriceConfidence() < 0.0 || rec.getPriceConfidence() > 1.0) {
            throw new IllegalArgumentException("Price confidence must be between 0 and 1");
        }
        
        if (rec.getRecommendedQuantity() <= 0) {
            throw new IllegalArgumentException("Recommended quantity must be a positive integer");
        }
        
        if (rec.getPriceReasoning() == null || rec.getPriceReasoning().isBlank()) {
            throw new IllegalArgumentException("Pricing reasoning must not be empty");
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
        return String.format("You are an AI Commerce Advisor for StockPulse. " +
                "Trigger: INVENTORY_LOW. " +
                "Product Name: %s. " +
                "Category: %s. " +
                "Current Price: %.2f. " +
                "Current Stock: %d. " +
                "Reorder Threshold: %d. " +
                "Demand Velocity (per day): %.2f. " +
                "Category Average Demand: %.2f. " +
                "Merchandising tradeoff: You need to decide whether to protect scarce inventory with a price increase OR use a discount/clearance approach if the product is stale. " +
                "Provide a JSON response with the following keys: recommendedPrice, direction (INCREASE, DECREASE, HOLD), confidence, pricingReasoning, recommendedQuantity, reorderConfidence, reorderReasoning, suggestedLeadTimeDays.",
                context.getProductName(), context.getCategory(), context.getCurrentPrice(), context.getCurrentStock(),
                context.getReorderThreshold(), context.getDemandVelocity(), context.getCategoryAverageDemandVelocity());
    }

    private String createDemandSpikePrompt(ProductContext context) {
        double categoryAvg = Math.max(context.getCategoryAverageDemandVelocity(), 1.0);
        return String.format("You are an AI Commerce Advisor for StockPulse. " +
                "Trigger: DEMAND_SPIKE. " +
                "Product Name: %s. " +
                "Category: %s. " +
                "Current Price: %.2f. " +
                "Current Stock: %d. " +
                "Reorder Threshold: %d. " +
                "Demand Velocity (per day): %.2f. " +
                "Category Average Demand: %.2f. " +
                "Velocity relative to category average: %.2fx. " +
                "Reasoning goal: Consider a modest pricing response to capitalize on demand while planning replenishment to avoid stockouts. " +
                "Provide a JSON response with the following keys: recommendedPrice, direction (INCREASE, DECREASE, HOLD), confidence, pricingReasoning, recommendedQuantity, reorderConfidence, reorderReasoning, suggestedLeadTimeDays.",
                context.getProductName(), context.getCategory(), context.getCurrentPrice(), context.getCurrentStock(),
                context.getReorderThreshold(), context.getDemandVelocity(), context.getCategoryAverageDemandVelocity(),
                (context.getDemandVelocity() / categoryAvg));
    }

    private String createManualPrompt(ProductContext context) {
        return String.format("You are an AI Commerce Advisor for StockPulse. " +
                "Trigger: MANUAL. " +
                "Product Name: %s. " +
                "Category: %s. " +
                "Current Price: %.2f. " +
                "Current Stock: %d. " +
                "Demand Velocity (per day): %.2f. " +
                "Provide a JSON response with the following keys: recommendedPrice, direction (INCREASE, DECREASE, HOLD), confidence, pricingReasoning, recommendedQuantity, reorderConfidence, reorderReasoning, suggestedLeadTimeDays.",
                context.getProductName(), context.getCategory(), context.getCurrentPrice(), context.getCurrentStock(), context.getDemandVelocity());
    }
}