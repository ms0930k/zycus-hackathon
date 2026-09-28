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
                "  \"pricingReasoning\": \"Low stock detected\",\n" +
                "  \"recommendedQuantity\": 25,\n" +
                "  \"reorderConfidence\": 0.91,\n" +
                "  \"reorderReasoning\": \"Calculated reorder quantity\",\n" +
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
        assertTrue(prompt.contains("Merchandising tradeoff"));
        assertTrue(prompt.contains("Test Product"));
    }

    @Test
    void testDemandSpikePromptIsGenuinelyDifferent() {
        ProductContext context = createTestContext();
        context.setTriggerContext("DEMAND_SPIKE");

        when(llmClient.callLlm(anyString())).thenReturn("{ \"recommendedPrice\": 110.0, \"direction\": \"INCREASE\", \"confidence\": 0.8, \"pricingReasoning\": \"x\", \"recommendedQuantity\": 10, \"reorderConfidence\": 0.8, \"reorderReasoning\": \"y\", \"suggestedLeadTimeDays\": 7 }");

        advisor.recommend(context);

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmClient).callLlm(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        
        assertTrue(prompt.contains("DEMAND_SPIKE"));
        assertTrue(prompt.contains("Reasoning goal: Consider a modest pricing response"));
        assertTrue(prompt.contains("Velocity relative to category average"));
        assertFalse(prompt.contains("INVENTORY_LOW"));
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
    }

    @Test
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