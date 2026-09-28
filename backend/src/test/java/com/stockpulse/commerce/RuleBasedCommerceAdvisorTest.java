package com.stockpulse.commerce;

import com.stockpulse.pricing.Direction;
import com.stockpulse.product.Category;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import static org.junit.jupiter.api.Assertions.*;

class RuleBasedCommerceAdvisorTest {

    private final RuleBasedCommerceAdvisor advisor = new RuleBasedCommerceAdvisor();

    @Test
    void testLowStockPricingRecommendation() {
        ProductContext context = new ProductContext();
        context.setProductName("Test Product");
        context.setCategory(Category.ELECTRONICS);
        context.setCurrentPrice(100.0);
        context.setCurrentStock(5);
        context.setReorderThreshold(10);
        context.setDemandVelocity(5.0);
        context.setCategoryAverageDemandVelocity(3.0);
        context.setTriggerContext("INVENTORY_LOW");

        CommerceRecommendation recommendation = advisor.recommend(context);

        assertEquals(110.0, recommendation.getRecommendedPrice(), 0.01);
        assertEquals(Direction.INCREASE, recommendation.getPriceDirection());
        assertEquals(0.9, recommendation.getPriceConfidence(), 0.01);
    }

    @Test
    void testDemandSpikePricingRecommendation() {
        ProductContext context = new ProductContext();
        context.setProductName("Test Product");
        context.setCategory(Category.ELECTRONICS);
        context.setCurrentPrice(100.0);
        context.setCurrentStock(50);
        context.setReorderThreshold(10);
        context.setDemandVelocity(10.0);
        context.setCategoryAverageDemandVelocity(3.0);
        context.setTriggerContext("DEMAND_SPIKE");

        CommerceRecommendation recommendation = advisor.recommend(context);

        assertEquals(105.0, recommendation.getRecommendedPrice(), 0.01);
        assertEquals(Direction.INCREASE, recommendation.getPriceDirection());
        assertEquals(0.8, recommendation.getPriceConfidence(), 0.01);
    }

    @Test
    void testNormalPricingRecommendation() {
        ProductContext context = new ProductContext();
        context.setProductName("Test Product");
        context.setCategory(Category.ELECTRONICS);
        context.setCurrentPrice(100.0);
        context.setCurrentStock(50);
        context.setReorderThreshold(10);
        context.setDemandVelocity(5.0);
        context.setCategoryAverageDemandVelocity(6.0);
        context.setTriggerContext("MANUAL");

        CommerceRecommendation recommendation = advisor.recommend(context);

        assertEquals(100.0, recommendation.getRecommendedPrice(), 0.01);
        assertEquals(Direction.HOLD, recommendation.getPriceDirection());
        assertEquals(0.7, recommendation.getPriceConfidence(), 0.01);
    }

    @Test
    void testReorderCalculation() {
        ProductContext context = new ProductContext();
        context.setProductName("Test Product");
        context.setCategory(Category.ELECTRONICS);
        context.setCurrentPrice(100.0);
        context.setCurrentStock(5);
        context.setReorderThreshold(10);
        context.setDemandVelocity(5.0);
        context.setCategoryAverageDemandVelocity(3.0);
        context.setTriggerContext("INVENTORY_LOW");

        CommerceRecommendation recommendation = advisor.recommend(context);

        // (10 * 3) - 5 = 25
        assertEquals(25, recommendation.getRecommendedQuantity());
        assertEquals(0.85, recommendation.getReorderConfidence(), 0.01);
        assertEquals(7, recommendation.getSuggestedLeadTimeDays());
    }

    @Test
    void testReorderMinimumQuantity() {
        ProductContext context = new ProductContext();
        context.setProductName("Test Product");
        context.setCategory(Category.ELECTRONICS);
        context.setCurrentPrice(100.0);
        context.setCurrentStock(50);
        context.setReorderThreshold(10);
        context.setDemandVelocity(5.0);
        context.setCategoryAverageDemandVelocity(3.0);
        context.setTriggerContext("INVENTORY_LOW");

        CommerceRecommendation recommendation = advisor.recommend(context);

        // (10 * 3) - 50 = -20, but minimum is 1
        assertEquals(1, recommendation.getRecommendedQuantity());
        assertEquals(0.85, recommendation.getReorderConfidence(), 0.01);
    }
}