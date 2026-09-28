package com.stockpulse.reorder;

import com.stockpulse.commerce.CategoryDemandService;
import com.stockpulse.commerce.CommerceAdvisor;
import com.stockpulse.commerce.ProductContext;
import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.common.TriggerReason;
import com.stockpulse.product.Product;
import com.stockpulse.product.ProductRepository;
import com.stockpulse.reorder.dto.ReorderSuggestionResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReorderSuggestionService {

    private final ReorderSuggestionRepository reorderSuggestionRepository;
    private final ProductRepository productRepository;
    private final CommerceAdvisor commerceAdvisor;
    private final CategoryDemandService categoryDemandService;

    public ReorderSuggestionService(
            ReorderSuggestionRepository reorderSuggestionRepository,
            ProductRepository productRepository,
            CommerceAdvisor commerceAdvisor,
            CategoryDemandService categoryDemandService) {
        this.reorderSuggestionRepository = reorderSuggestionRepository;
        this.productRepository = productRepository;
        this.commerceAdvisor = commerceAdvisor;
        this.categoryDemandService = categoryDemandService;
    }

    public ReorderSuggestion createManualReorderSuggestion(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        // Create product context
        ProductContext context = createProductContext(product, "MANUAL");

        // Get recommendation from commerce advisor
        com.stockpulse.commerce.CommerceRecommendation recommendation = commerceAdvisor.recommend(context);

        // Create reorder suggestion
        ReorderSuggestion reorderSuggestion = new ReorderSuggestion();
        reorderSuggestion.setProduct(product);
        reorderSuggestion.setCurrentStock(product.getStockLevel());
        reorderSuggestion.setRecommendedQuantity(recommendation.getRecommendedQuantity());
        reorderSuggestion.setSuggestedLeadTimeDays(recommendation.getSuggestedLeadTimeDays());
        reorderSuggestion.setConfidence(recommendation.getReorderConfidence());
        reorderSuggestion.setReasoning(recommendation.getReorderReasoning());
        reorderSuggestion.setTriggerReason(TriggerReason.MANUAL);
        reorderSuggestion.setStatus(SuggestionStatus.PENDING);

        return reorderSuggestionRepository.save(reorderSuggestion);
    }

    @Transactional
    public ReorderSuggestion updateReorderSuggestionStatus(Long suggestionId, SuggestionStatus newStatus) {
        ReorderSuggestion suggestion = reorderSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new RuntimeException("Reorder suggestion not found: " + suggestionId));

        // Validate status transition
        if (suggestion.getStatus() != SuggestionStatus.PENDING) {
            throw new IllegalStateException("Cannot change status from " + suggestion.getStatus() + " to " + newStatus);
        }

        if (newStatus != SuggestionStatus.ACCEPTED && newStatus != SuggestionStatus.REJECTED) {
            throw new IllegalArgumentException("Invalid status: " + newStatus);
        }

        suggestion.setStatus(newStatus);
        ReorderSuggestion updatedSuggestion = reorderSuggestionRepository.save(suggestion);

        // If accepted, update the product stock
        if (newStatus == SuggestionStatus.ACCEPTED) {
            Product product = suggestion.getProduct();
            int newStock = product.getStockLevel() + suggestion.getRecommendedQuantity();
            product.setStockLevel(newStock);
            product.setStatus(com.stockpulse.product.Status.ACTIVE);
            productRepository.save(product);
        }

        return updatedSuggestion;
    }

    public java.util.List<ReorderSuggestionResponse> getProductReorderSuggestions(Long productId) {
        return reorderSuggestionRepository.findByProductIdOrderByCreatedAtDesc(productId)
                .stream()
                .map(this::toReorderSuggestionResponse)
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

    private ReorderSuggestionResponse toReorderSuggestionResponse(ReorderSuggestion suggestion) {
        return new ReorderSuggestionResponse(
                suggestion.getId(),
                suggestion.getProduct().getId(),
                suggestion.getCurrentStock(),
                suggestion.getRecommendedQuantity(),
                suggestion.getSuggestedLeadTimeDays(),
                suggestion.getConfidence(),
                suggestion.getReasoning(),
                suggestion.getStatus(),
                suggestion.getTriggerReason(),
                suggestion.getCreatedAt(),
                suggestion.getUpdatedAt()
        );
    }
}