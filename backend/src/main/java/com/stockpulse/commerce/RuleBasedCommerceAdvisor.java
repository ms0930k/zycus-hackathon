package com.stockpulse.commerce;

import com.stockpulse.pricing.Direction;
import org.springframework.stereotype.Component;

@Component
public class RuleBasedCommerceAdvisor implements CommerceAdvisor {

    @Override
    public CommerceRecommendation recommend(ProductContext context) {
        CommerceRecommendation recommendation = new CommerceRecommendation();
        
        // Pricing recommendation
        if (context.getCurrentStock() < context.getReorderThreshold()) {
            // Low stock rule: increase price by 10%
            recommendation.setRecommendedPrice(context.getCurrentPrice() * 1.10);
            recommendation.setPriceDirection(Direction.INCREASE);
            recommendation.setPriceConfidence(0.9);
            recommendation.setPriceReasoning("Low stock detected. Increasing price by 10% to protect remaining inventory and potentially reduce demand.");
        } else if (context.getDemandVelocity() > 2 * context.getCategoryAverageDemandVelocity()) {
            // Demand spike rule: increase price by 5%
            recommendation.setRecommendedPrice(context.getCurrentPrice() * 1.05);
            recommendation.setPriceDirection(Direction.INCREASE);
            recommendation.setPriceConfidence(0.8);
            recommendation.setPriceReasoning("High demand velocity detected (more than 2x category average). Modest price increase to balance supply and demand.");
        } else {
            // Hold current price
            recommendation.setRecommendedPrice(context.getCurrentPrice());
            recommendation.setPriceDirection(Direction.HOLD);
            recommendation.setPriceConfidence(0.7);
            recommendation.setPriceReasoning("Stable demand and adequate stock levels. No price adjustment recommended.");
        }
        
        // Reorder recommendation
        int recommendedQuantity = (context.getReorderThreshold() * 3) - context.getCurrentStock();
        if (recommendedQuantity < 1) {
            recommendedQuantity = 1;
        }
        
        recommendation.setRecommendedQuantity(recommendedQuantity);
        recommendation.setReorderConfidence(0.85);
        recommendation.setReorderReasoning("Calculated reorder quantity based on triple the reorder threshold minus current stock.");
        recommendation.setSuggestedLeadTimeDays(7); // Default lead time
        
        return recommendation;
    }
}