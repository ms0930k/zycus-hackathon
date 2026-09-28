package com.stockpulse.pricing;

import com.stockpulse.commerce.CategoryDemandService;
import com.stockpulse.commerce.CommerceAdvisor;
import com.stockpulse.commerce.ProductContext;
import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.common.TriggerReason;
import com.stockpulse.pricing.dto.PricingSuggestionResponse;
import com.stockpulse.product.Product;
import com.stockpulse.product.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PricingSuggestionService {

    private final PricingSuggestionRepository pricingSuggestionRepository;
    private final ProductRepository productRepository;
    private final CommerceAdvisor commerceAdvisor;
    private final CategoryDemandService categoryDemandService;

    public PricingSuggestionService(
            PricingSuggestionRepository pricingSuggestionRepository,
            ProductRepository productRepository,
            CommerceAdvisor commerceAdvisor,
            CategoryDemandService categoryDemandService) {
        this.pricingSuggestionRepository = pricingSuggestionRepository;
        this.productRepository = productRepository;
        this.commerceAdvisor = commerceAdvisor;
        this.categoryDemandService = categoryDemandService;
    }

    public PricingSuggestion createManualPricingSuggestion(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        // Create product context
        ProductContext context = createProductContext(product, "MANUAL");

        // Get recommendation from commerce advisor
        com.stockpulse.commerce.CommerceRecommendation recommendation = commerceAdvisor.recommend(context);

        // Create pricing suggestion
        PricingSuggestion pricingSuggestion = new PricingSuggestion();
        pricingSuggestion.setProduct(product);
        pricingSuggestion.setCurrentPrice(product.getCurrentPrice());
        pricingSuggestion.setRecommendedPrice(java.math.BigDecimal.valueOf(recommendation.getRecommendedPrice()));
        pricingSuggestion.setDirection(recommendation.getPriceDirection());
        pricingSuggestion.setConfidence(recommendation.getPriceConfidence());
        pricingSuggestion.setReasoning(recommendation.getPriceReasoning());
        pricingSuggestion.setTriggerReason(TriggerReason.MANUAL);
        pricingSuggestion.setStatus(SuggestionStatus.PENDING);

        return pricingSuggestionRepository.save(pricingSuggestion);
    }

    @Transactional
    public PricingSuggestion updatePricingSuggestionStatus(Long suggestionId, SuggestionStatus newStatus) {
        PricingSuggestion suggestion = pricingSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new RuntimeException("Pricing suggestion not found: " + suggestionId));

        // Validate status transition
        if (suggestion.getStatus() != SuggestionStatus.PENDING) {
            throw new IllegalStateException("Cannot change status from " + suggestion.getStatus() + " to " + newStatus);
        }

        if (newStatus != SuggestionStatus.ACCEPTED && newStatus != SuggestionStatus.REJECTED) {
            throw new IllegalArgumentException("Invalid status: " + newStatus);
        }

        suggestion.setStatus(newStatus);
        PricingSuggestion updatedSuggestion = pricingSuggestionRepository.save(suggestion);

        // If accepted, update the product price
        if (newStatus == SuggestionStatus.ACCEPTED) {
            Product product = suggestion.getProduct();
            product.setCurrentPrice(suggestion.getRecommendedPrice());
            product.setStatus(com.stockpulse.product.Status.ACTIVE);
            productRepository.save(product);
        }

        return updatedSuggestion;
    }

    public List<PricingSuggestionResponse> getProductPricingSuggestions(Long productId) {
        return pricingSuggestionRepository.findByProductIdOrderByCreatedAtDesc(productId)
                .stream()
                .map(this::toPricingSuggestionResponse)
                .collect(Collectors.toList());
    }

    private ProductContext createProductContext(Product product, String triggerContext) {
        double categoryAverage = categoryDemandService.getCategoryAverageDemandVelocity(product.getCategory());

        ProductContext context = new ProductContext();
        context.setProductName(product.getName());
        context.setCategory(product.getCategory());
        context.setCurrentPrice(product.getCurrentPrice().doubleValue());
        context.setCurrentStock(product.getStockLevel());
        context.setReorderThreshold(product.getReorderThreshold());
        context.setDemandVelocity(product.getDemandVelocity());
        context.setCategoryAverageDemandVelocity(categoryAverage);
        context.setTriggerContext(triggerContext);

        return context;
    }

    private PricingSuggestionResponse toPricingSuggestionResponse(PricingSuggestion suggestion) {
        return new PricingSuggestionResponse(
                suggestion.getId(),
                suggestion.getProduct().getId(),
                suggestion.getCurrentPrice(),
                suggestion.getRecommendedPrice(),
                suggestion.getDirection(),
                suggestion.getConfidence(),
                suggestion.getReasoning(),
                suggestion.getStatus(),
                suggestion.getTriggerReason(),
                suggestion.getCreatedAt(),
                suggestion.getUpdatedAt()
        );
    }
}