package com.stockpulse.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "llm.provider", havingValue = "mock", matchIfMissing = true)
public class MockLlmClient implements LlmClient {

    @Value("${llm.api.key:}")
    private String apiKey;

    @Override
    public String callLlm(String prompt) {
        // Mock implementation for testing
        // In a real implementation, this would call an actual LLM API
        return """
                {
                  "recommendedPrice": 87.99,
                  "direction": "INCREASE",
                  "confidence": 0.86,
                  "pricingReasoning": "Low stock detected. Increasing price to protect remaining inventory.",
                  "recommendedQuantity": 52,
                  "reorderConfidence": 0.91,
                  "reorderReasoning": "Calculated reorder quantity to maintain adequate stock levels.",
                  "suggestedLeadTimeDays": 7
                }
                """;
    }
}