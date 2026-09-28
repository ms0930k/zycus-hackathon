package com.stockpulse.agent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class AgentEventListener {

    private static final Logger logger = LoggerFactory.getLogger(AgentEventListener.class);

    private final AgenticRecommendationService recommendationService;

    public AgentEventListener(AgenticRecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @Async
    @EventListener
    public void handleInventoryLowEvent(InventoryLowEvent event) {
        logger.info("[AGENT] Received inventory low event for product ID: {}", event.getProductId());
        try {
            recommendationService.handleInventoryLowEvent(event);
        } catch (Exception e) {
            logger.error("[AGENT] Failed to process inventory low event for product ID: {}", event.getProductId(), e);
        }
    }

    @Async
    @EventListener
    public void handleDemandSpikeEvent(DemandSpikeEvent event) {
        logger.info("[AGENT] Received demand spike event for product ID: {}", event.getProductId());
        try {
            recommendationService.handleDemandSpikeEvent(event);
        } catch (Exception e) {
            logger.error("[AGENT] Failed to process demand spike event for product ID: {}", event.getProductId(), e);
        }
    }
}