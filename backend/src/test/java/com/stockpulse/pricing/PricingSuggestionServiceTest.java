package com.stockpulse.pricing;

import com.stockpulse.commerce.CategoryDemandService;
import com.stockpulse.commerce.CommerceAdvisor;
import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.product.Product;
import com.stockpulse.product.ProductRepository;
import com.stockpulse.product.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PricingSuggestionServiceTest {

    @Mock
    private PricingSuggestionRepository pricingSuggestionRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CommerceAdvisor commerceAdvisor;

    @Mock
    private CategoryDemandService categoryDemandService;

    private PricingSuggestionService pricingSuggestionService;

    @BeforeEach
    void setUp() {
        pricingSuggestionService = new PricingSuggestionService(
                pricingSuggestionRepository,
                productRepository,
                commerceAdvisor,
                categoryDemandService
        );
    }

    @Test
    void testAcceptPricingSuggestion() {
        // Arrange
        Long suggestionId = 1L;
        Long productId = 1L;
        
        PricingSuggestion suggestion = new PricingSuggestion();
        suggestion.setId(suggestionId);
        suggestion.setStatus(SuggestionStatus.PENDING);
        suggestion.setRecommendedPrice(BigDecimal.valueOf(110.0));
        
        Product product = new Product();
        product.setId(productId);
        product.setStatus(Status.PRICE_REVIEW_PENDING);
        
        suggestion.setProduct(product);
        
        when(pricingSuggestionRepository.findById(suggestionId)).thenReturn(Optional.of(suggestion));
        when(pricingSuggestionRepository.save(any(PricingSuggestion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        PricingSuggestion updatedSuggestion = pricingSuggestionService.updatePricingSuggestionStatus(suggestionId, SuggestionStatus.ACCEPTED);

        // Assert
        assertEquals(SuggestionStatus.ACCEPTED, updatedSuggestion.getStatus());
        assertEquals(BigDecimal.valueOf(110.0), product.getCurrentPrice());
        assertEquals(Status.ACTIVE, product.getStatus());
        verify(productRepository).save(product);
    }

    @Test
    void testRejectPricingSuggestion() {
        // Arrange
        Long suggestionId = 1L;
        Long productId = 1L;
        
        PricingSuggestion suggestion = new PricingSuggestion();
        suggestion.setId(suggestionId);
        suggestion.setStatus(SuggestionStatus.PENDING);
        suggestion.setRecommendedPrice(BigDecimal.valueOf(110.0));
        
        Product product = new Product();
        product.setId(productId);
        product.setCurrentPrice(BigDecimal.valueOf(100.0));
        product.setStatus(Status.PRICE_REVIEW_PENDING);
        
        suggestion.setProduct(product);
        
        when(pricingSuggestionRepository.findById(suggestionId)).thenReturn(Optional.of(suggestion));
        when(pricingSuggestionRepository.save(any(PricingSuggestion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        PricingSuggestion updatedSuggestion = pricingSuggestionService.updatePricingSuggestionStatus(suggestionId, SuggestionStatus.REJECTED);

        // Assert
        assertEquals(SuggestionStatus.REJECTED, updatedSuggestion.getStatus());
        assertEquals(BigDecimal.valueOf(100.0), product.getCurrentPrice()); // Should remain unchanged
        verify(productRepository, never()).save(any());
    }

    @Test
    void testInvalidStatusTransition() {
        // Arrange
        Long suggestionId = 1L;
        
        PricingSuggestion suggestion = new PricingSuggestion();
        suggestion.setId(suggestionId);
        suggestion.setStatus(SuggestionStatus.ACCEPTED); // Already accepted
        
        when(pricingSuggestionRepository.findById(suggestionId)).thenReturn(Optional.of(suggestion));

        // Act & Assert
        assertThrows(IllegalStateException.class, () -> {
            pricingSuggestionService.updatePricingSuggestionStatus(suggestionId, SuggestionStatus.REJECTED);
        });
    }
}