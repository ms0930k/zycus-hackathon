package com.stockpulse.agent;

import com.stockpulse.commerce.*;
import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.common.TriggerReason;
import com.stockpulse.pricing.PricingSuggestion;
import com.stockpulse.pricing.PricingSuggestionRepository;
import com.stockpulse.product.Product;
import com.stockpulse.product.ProductRepository;
import com.stockpulse.reorder.ReorderSuggestion;
import com.stockpulse.reorder.ReorderSuggestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgenticRecommendationService {

    private static final Logger logger = LoggerFactory.getLogger(AgenticRecommendationService.class);

    private final ProductRepository productRepository;
    private final PricingSuggestionRepository pricingSuggestionRepository;
    private final ReorderSuggestionRepository reorderSuggestionRepository;
    private final CommerceAdvisor commerceAdvisor;
    private final CategoryDemandService categoryDemandService;

    public AgenticRecommendationService(
            ProductRepository productRepository,
            PricingSuggestionRepository pricingSuggestionRepository,
            ReorderSuggestionRepository reorderSuggestionRepository,
            CommerceAdvisor commerceAdvisor,
            CategoryDemandService categoryDemandService) {
        this.productRepository = productRepository;
        this.pricingSuggestionRepository = pricingSuggestionRepository;
        this.reorderSuggestionRepository = reorderSuggestionRepository;
        this.commerceAdvisor = commerceAdvisor;
        this.categoryDemandService = categoryDemandService;
    }

    @Transactional
    public void handleInventoryLowEvent(InventoryLowEvent event) {
        logger.info("[AGENT] Processing inventory low event for product ID: {}", event.getProductId());
        
        Product product = productRepository.findById(event.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + event.getProductId()));

        // Check if we already have a pending suggestion for this trigger
        if (hasPendingPricingSuggestion(product.getId(), TriggerReason.INVENTORY_LOW)) {
            logger.info("[AGENT] Skipping duplicate pricing suggestion for product ID: {}", product.getId());
            return;
        }

        if (hasPendingReorderSuggestion(product.getId(), TriggerReason.INVENTORY_LOW)) {
            logger.info("[AGENT] Skipping duplicate reorder suggestion for product ID: {}", product.getId());
            return;
        }

        // Create product context
        ProductContext context = createProductContext(product, "INVENTORY_LOW");

        // Get recommendation from commerce advisor
        CommerceRecommendation recommendation = commerceAdvisor.recommend(context);

        // Create pricing suggestion
        createPricingSuggestion(product, recommendation, TriggerReason.INVENTORY_LOW);

        // Create reorder suggestion
        createReorderSuggestion(product, recommendation, TriggerReason.INVENTORY_LOW);

        logger.info("[AGENT] Created pricing and reorder suggestions for product ID: {}", product.getId());
    }

    @Transactional
    public void handleDemandSpikeEvent(DemandSpikeEvent event) {
        logger.info("[AGENT] Processing demand spike event for product ID: {}", event.getProductId());
        
        Product product = productRepository.findById(event.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + event.getProductId()));

        // Check if we already have a pending suggestion for this trigger
        if (hasPendingPricingSuggestion(product.getId(), TriggerReason.DEMAND_SPIKE)) {
            logger.info("[AGENT] Skipping duplicate pricing suggestion for product ID: {}", product.getId());
            return;
        }

        if (hasPendingReorderSuggestion(product.getId(), TriggerReason.DEMAND_SPIKE)) {
            logger.info("[AGENT] Skipping duplicate reorder suggestion for product ID: {}", product.getId());
            return;
        }

        // Create product context
        ProductContext context = createProductContext(product, "DEMAND_SPIKE");

        // Get recommendation from commerce advisor
        CommerceRecommendation recommendation = commerceAdvisor.recommend(context);

        // Create pricing suggestion
        createPricingSuggestion(product, recommendation, TriggerReason.DEMAND_SPIKE);

        // Create reorder suggestion
        createReorderSuggestion(product, recommendation, TriggerReason.DEMAND_SPIKE);

        logger.info("[AGENT] Created pricing and reorder suggestions for product ID: {}", product.getId());
    }

    private boolean hasPendingPricingSuggestion(Long productId, TriggerReason triggerReason) {
        return pricingSuggestionRepository.findByProductIdAndTriggerReasonAndStatus(
                productId, triggerReason, SuggestionStatus.PENDING).isPresent();
    }

    private boolean hasPendingReorderSuggestion(Long productId, TriggerReason triggerReason) {
        return reorderSuggestionRepository.findByProductIdAndTriggerReasonAndStatus(
                productId, triggerReason, SuggestionStatus.PENDING).isPresent();
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

    private void createPricingSuggestion(Product product, CommerceRecommendation recommendation, TriggerReason triggerReason) {
        PricingSuggestion pricingSuggestion = new PricingSuggestion();
        pricingSuggestion.setProduct(product);
        pricingSuggestion.setCurrentPrice(product.getCurrentPrice());
        pricingSuggestion.setRecommendedPrice(java.math.BigDecimal.valueOf(recommendation.getRecommendedPrice()));
        pricingSuggestion.setDirection(recommendation.getPriceDirection());
        pricingSuggestion.setConfidence(recommendation.getPriceConfidence());
        pricingSuggestion.setReasoning(recommendation.getPriceReasoning());
        pricingSuggestion.setTriggerReason(triggerReason);
        pricingSuggestion.setStatus(SuggestionStatus.PENDING);
        
        pricingSuggestionRepository.save(pricingSuggestion);
    }

    private void createReorderSuggestion(Product product, CommerceRecommendation recommendation, TriggerReason triggerReason) {
        ReorderSuggestion reorderSuggestion = new ReorderSuggestion();
        reorderSuggestion.setProduct(product);
        reorderSuggestion.setCurrentStock(product.getStockLevel());
        reorderSuggestion.setRecommendedQuantity(recommendation.getRecommendedQuantity());
        reorderSuggestion.setSuggestedLeadTimeDays(recommendation.getSuggestedLeadTimeDays());
        reorderSuggestion.setConfidence(recommendation.getReorderConfidence());
        reorderSuggestion.setReasoning(recommendation.getReorderReasoning());
        reorderSuggestion.setTriggerReason(triggerReason);
        reorderSuggestion.setStatus(SuggestionStatus.PENDING);
        
        reorderSuggestionRepository.save(reorderSuggestion);
    }
}