package com.stockpulse.agent;

public class DemandSpikeEvent {
    private final Long productId;

    public DemandSpikeEvent(Long productId) {
        this.productId = productId;
    }

    public Long getProductId() {
        return productId;
    }
}