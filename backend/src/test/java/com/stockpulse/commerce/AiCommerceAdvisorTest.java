package com.stockpulse.commerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockpulse.ai.LlmClient;
import com.stockpulse.pricing.Direction;
import com.stockpulse.product.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiCommerceAdvisorTest {

    @Mock
    private LlmClient llmClient;

    @Mock
    private RuleBasedCommerceAdvisor ruleBasedCommerceAdvisor;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private AiCommerceAdvisor advisor;

    @BeforeEach
    void setUp() {
        advisor = new AiCommerceAdvisor(llmClient, objectMapper, ruleBasedCommerceAdvisor);
    }

    private ProductContext createTestContext() {
        ProductContext context = new ProductContext();
        context.setProductName("Test Product");
        context.setCategory(Category.ELECTRONICS);
        context.setCurrentPrice(100.0);
        context.setCurrentStock(5);
        context.setReorderThreshold(10);
        context.setDemandVelocity(5.0);
        context.setCategoryAverageDemandVelocity(3.0);
        return context;
    private ProductContext createHighDemandLowStockContext() {
        ProductContext context = new ProductContext();
        context.setProductName("Popular Product");
        context.setCategory(Category.APPAREL);
        context.setCurrentPrice(50.0);
        context.setCurrentStock(3);
        context.setReorderThreshold(15);
        context.setDemandVelocity(12.0);
        context.setCategoryAverageDemandVelocity(4.0);
        return context;
    }

    private ProductContext createLowDemandAdequateStockContext() {
        ProductContext context = new ProductContext();
        context.setProductName("Slow Product");
        context.setCategory(Category.HOME);
        context.setCurrentPrice(80.0);
        context.setCurrentStock(25);
        context.setReorderThreshold(10);
        context.setDemandVelocity(1.0);
        context.setCategoryAverageDemandVelocity(3.0);
        return context;
    }
    }

    private CommerceRecommendation createMockFallback() {
        CommerceRecommendation fallback = new CommerceRecommendation();
        fallback.setRecommendedPrice(110.0);
        fallback.setRecommendedQuantity(25);
        return fallback;
    }

    @Test
    void testAiRecommendationSuccessAndStripsMarkdown() {
        ProductContext context = createTestContext();
        context.setTriggerContext("INVENTORY_LOW");

        String validJsonResponse = "```json\n" +
                "{\n" +
                "  \"recommendedPrice\": 110.0,\n" +
                "  \"direction\": \"INCREASE\",\n" +
                "  \"confidence\": 0.86,\n" +
                "  \"pricingReasoning\": \"Stockout risk is elevated because inventory is below threshold while demand is healthy\",\n" +
                "  \"recommendedQuantity\": 25,\n" +
                "  \"reorderConfidence\": 0.91,\n" +
                "  \"reorderReasoning\": \"To restore adequate stock levels considering current demand velocity\",\n" +
                "  \"suggestedLeadTimeDays\": 7\n" +
                "}\n" +
                "```";

        when(llmClient.callLlm(anyString())).thenReturn(validJsonResponse);

        CommerceRecommendation recommendation = advisor.recommend(context);

        assertEquals(110.0, recommendation.getRecommendedPrice(), 0.01);
        assertEquals(Direction.INCREASE, recommendation.getPriceDirection());
        assertEquals(0.86, recommendation.getPriceConfidence(), 0.01);
        assertEquals(25, recommendation.getRecommendedQuantity());
        verify(ruleBasedCommerceAdvisor, never()).recommend(any());
        
        // Verify inventory-low prompt contains required context
        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmClient).callLlm(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        assertTrue(prompt.contains("INVENTORY_LOW"));
        assertTrue(prompt.contains("retail merchandising decision engine"));
        assertTrue(prompt.contains("Test Product"));
        assertTrue(prompt.contains("COMMERCIAL ANALYSIS"));
        assertTrue(prompt.contains("INSTRUCTIONS"));
    }

    @Test
    void testDemandSpikePromptIsGenuinelyDifferent() {
        ProductContext context = createTestContext();
        context.setTriggerContext("DEMAND_SPIKE");

        when(llmClient.callLlm(anyString())).thenReturn("{ \"recommendedPrice\": 105.0, \"direction\": \"INCREASE\", \"confidence\": 0.8, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 10, \"reorderConfidence\": 0.8, \"reorderReasoning\": \"y\", \"suggestedLeadTimeDays\": 7 }");

        advisor.recommend(context);

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmClient).callLlm(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        
        assertTrue(prompt.contains("DEMAND_SPIKE"));
        assertTrue(prompt.contains("demand spike situation with commercial realism"));
        assertTrue(prompt.contains("DEMAND ACCELERATION"));
        assertTrue(prompt.contains("ACCELERATING DEMAND"));
        assertFalse(prompt.contains("INVENTORY_LOW"));
        assertFalse(prompt.contains("Merchandising tradeoff"));
    }

    @Test
    void testMalformedJsonFallsBackToRuleBased() {
        ProductContext context = createTestContext();
        context.setTriggerContext("INVENTORY_LOW");

        when(llmClient.callLlm(anyString())).thenReturn("{ invalid json ");
        when(ruleBasedCommerceAdvisor.recommend(context)).thenReturn(createMockFallback());

        CommerceRecommendation rec = advisor.recommend(context);

        assertEquals(110.0, rec.getRecommendedPrice());
        verify(ruleBasedCommerceAdvisor).recommend(context);
    }

    @Test
    void testInvalidPriceFallsBackToRuleBased() {
        ProductContext context = createTestContext();
        context.setTriggerContext("INVENTORY_LOW");

        // Price is 0
        String json = "{ \"recommendedPrice\": 0.0, \"direction\": \"HOLD\", \"confidence\": 0.8, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 10 }";
        when(llmClient.callLlm(anyString())).thenReturn(json);
        when(ruleBasedCommerceAdvisor.recommend(context)).thenReturn(createMockFallback());

        CommerceRecommendation rec = advisor.recommend(context);

        assertEquals(110.0, rec.getRecommendedPrice());
        verify(ruleBasedCommerceAdvisor).recommend(context);
    @Test
    void testExtremePriceOutOfBoundsFallsBackToRuleBased() {
        ProductContext context = createTestContext();
        context.setTriggerContext("INVENTORY_LOW");

        // Price is way too high (400 vs current 100)
        String json = "{ \"recommendedPrice\": 400.0, \"direction\": \"INCREASE\", \"confidence\": 0.8, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 10 }";
        when(llmClient.callLlm(anyString())).thenReturn(json);
        when(ruleBasedCommerceAdvisor.recommend(context)).thenReturn(createMockFallback());

        CommerceRecommendation rec = advisor.recommend(context);

        assertEquals(110.0, rec.getRecommendedPrice());
        verify(ruleBasedCommerceAdvisor).recommend(context);
    }
    }

    @Test
    @Test
    void testHighDemandLowStockScenarioGeneratesAppropriateContext() {
        ProductContext context = createHighDemandLowStockContext();
        context.setTriggerContext("INVENTORY_LOW");

        when(llmClient.callLlm(anyString())).thenReturn("{ \"recommendedPrice\": 55.0, \"direction\": \"INCREASE\", \"confidence\": 0.9, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 42, \"reorderConfidence\": 0.9, \"reorderReasoning\": \"y\", \"suggestedLeadTimeDays\": 7 }");

        advisor.recommend(context);

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmClient).callLlm(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        
        // Should recognize high demand scenario
        assertTrue(prompt.contains("significantly above average"));
        assertTrue(prompt.contains("HIGH DEMAND + LOW STOCK: PROTECT INVENTORY"));
        assertTrue(prompt.contains("Stockout risk is HIGH"));
        assertTrue(prompt.contains("Scarcity value: ELEVATED"));
    }

    @Test
    void testLowDemandAdequateStockScenarioRecognizesConservativeApproach() {
        ProductContext context = createLowDemandAdequateStockContext();
        context.setTriggerContext("INVENTORY_LOW");

        when(llmClient.callLlm(anyString())).thenReturn("{ \"recommendedPrice\": 75.0, \"direction\": \"DECREASE\", \"confidence\": 0.6, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 5, \"reorderConfidence\": 0.6, \"reorderReasoning\": \"y\", \"suggestedLeadTimeDays\": 7 }");

        advisor.recommend(context);

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmClient).callLlm(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        
        // Should recognize low demand scenario
        assertTrue(prompt.contains("below category average"));
        assertTrue(prompt.contains("LOW DEMAND + LOW STOCK: CONSIDER CLEARANCE"));
        assertTrue(prompt.contains("Stockout risk: LOW"));
        assertTrue(prompt.contains("Scarcity value: LOW"));
    }

    @Test
    void testDemandSpikeRecognizesAccelerationStrength() {
        ProductContext context = createHighDemandLowStockContext(); // 12.0 vs 4.0 = 3x category avg
        context.setTriggerContext("DEMAND_SPIKE");

        when(llmClient.callLlm(anyString())).thenReturn("{ \"recommendedPrice\": 52.5, \"direction\": \"INCREASE\", \"confidence\": 0.85, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 40, \"reorderConfidence\": 0.85, \"reorderReasoning\": \"y\", \"suggestedLeadTimeDays\": 7 }");

        advisor.recommend(context);

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmClient).callLlm(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        
        // Should recognize significant acceleration
        assertTrue(prompt.contains("significantly above average"));
        assertTrue(prompt.contains("Demand is 3.0x the category average"));
        assertTrue(prompt.contains("FAVORABLE FOR MODERATE INCREASE"));
        assertTrue(prompt.contains("Revenue opportunity: STRONG"));
    }
}
    @Test
    void testManualPromptContainsComprehensiveAnalysis() {
        ProductContext context = createTestContext();
        context.setTriggerContext("MANUAL");

        when(llmClient.callLlm(anyString())).thenReturn("{ \"recommendedPrice\": 100.0, \"direction\": \"HOLD\", \"confidence\": 0.7, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 20, \"reorderConfidence\": 0.7, \"reorderReasoning\": \"y\", \"suggestedLeadTimeDays\": 7 }");

        advisor.recommend(context);

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmClient).callLlm(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        
        assertTrue(prompt.contains("MANUAL"));
        assertTrue(prompt.contains("comprehensive commercial assessment"));
        assertTrue(prompt.contains("CONTEXTUAL ANALYSIS"));
        assertTrue(prompt.contains("COMPREHENSIVE FACTORS"));
    }
    void testInvalidReorderQuantityFallsBackToRuleBased() {
        ProductContext context = createTestContext();
        context.setTriggerContext("INVENTORY_LOW");

        // Quantity is 0
        String json = "{ \"recommendedPrice\": 100.0, \"direction\": \"HOLD\", \"confidence\": 0.8, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 0 }";
        when(llmClient.callLlm(anyString())).thenReturn(json);
        when(ruleBasedCommerceAdvisor.recommend(context)).thenReturn(createMockFallback());

        CommerceRecommendation rec = advisor.recommend(context);

        assertEquals(110.0, rec.getRecommendedPrice());
        verify(ruleBasedCommerceAdvisor).recommend(context);
    }

    @Test
    void testLlmExceptionFallsBackToRuleBased() {
        ProductContext context = createTestContext();
        context.setTriggerContext("INVENTORY_LOW");

        when(llmClient.callLlm(anyString())).thenThrow(new RuntimeException("Timeout"));
        when(ruleBasedCommerceAdvisor.recommend(context)).thenReturn(createMockFallback());

        CommerceRecommendation rec = advisor.recommend(context);

        assertEquals(110.0, rec.getRecommendedPrice());
        verify(ruleBasedCommerceAdvisor).recommend(context);
    }
}