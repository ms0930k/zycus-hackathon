package com.stockpulse.agent;

import com.stockpulse.commerce.CategoryDemandService;
import com.stockpulse.commerce.CommerceAdvisor;
import com.stockpulse.commerce.CommerceRecommendation;
import com.stockpulse.commerce.RuleBasedCommerceAdvisor;
import com.stockpulse.pricing.Direction;
import com.stockpulse.pricing.PricingSuggestionRepository;
import com.stockpulse.product.Product;
import com.stockpulse.product.ProductRepository;
import com.stockpulse.reorder.ReorderSuggestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import java.math.BigDecimal;
import java.util.Optional;
import static org.mockito.ArgumentMatchers.any;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgenticRecommendationServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PricingSuggestionRepository pricingSuggestionRepository;

    @Mock
    private ReorderSuggestionRepository reorderSuggestionRepository;

    @Mock
    private CategoryDemandService categoryDemandService;

    @Mock
    private CommerceAdvisor commerceAdvisor;

    private AgenticRecommendationService recommendationService;

    @BeforeEach
    void setUp() {
        recommendationService = new AgenticRecommendationService(
                productRepository,
                pricingSuggestionRepository,
                reorderSuggestionRepository,
                commerceAdvisor,
                categoryDemandService
        );
    }

    @Test
    void testHandleInventoryLowEvent() {
        // Arrange
        Long productId = 1L;
        Product product = new Product();
        product.setId(productId);
        product.setName("Test Product");
        product.setCurrentPrice(BigDecimal.valueOf(100.0));

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(pricingSuggestionRepository.findByProductIdAndTriggerReasonAndStatus(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(reorderSuggestionRepository.findByProductIdAndTriggerReasonAndStatus(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(categoryDemandService.getCategoryAverageDemandVelocity(any())).thenReturn(5.0);

        CommerceRecommendation recommendation = new CommerceRecommendation();
        recommendation.setRecommendedPrice(110.0);
        recommendation.setPriceDirection(Direction.INCREASE);
        recommendation.setPriceConfidence(0.9);
        recommendation.setPriceReasoning("Test reasoning");
        recommendation.setRecommendedQuantity(25);
        recommendation.setReorderConfidence(0.85);
        recommendation.setReorderReasoning("Test reorder reasoning");
        recommendation.setSuggestedLeadTimeDays(7);

        when(commerceAdvisor.recommend(any())).thenReturn(recommendation);

        // Act
        recommendationService.handleInventoryLowEvent(new InventoryLowEvent(productId));

        // Assert
        verify(productRepository).findById(productId);
        verify(commerceAdvisor).recommend(any());
        verify(pricingSuggestionRepository).save(any());
        verify(reorderSuggestionRepository).save(any());
    }

    @Test
    void testDuplicatePrevention() {
        // Arrange
        Long productId = 1L;
        Product product = new Product();
        product.setId(productId);
        product.setName("Test Product");

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(pricingSuggestionRepository.findByProductIdAndTriggerReasonAndStatus(any(), any(), any()))
                .thenReturn(Optional.of(new com.stockpulse.pricing.PricingSuggestion()));

        // Act
        recommendationService.handleInventoryLowEvent(new InventoryLowEvent(productId));

        // Assert
        verify(commerceAdvisor, never()).recommend(any());
        verify(pricingSuggestionRepository, never()).save(any());
    }
}