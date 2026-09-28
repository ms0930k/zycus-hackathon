package com.stockpulse.agent;

public class InventoryLowEvent {
    private final Long productId;

    public InventoryLowEvent(Long productId) {
        this.productId = productId;
    }

    public Long getProductId() {
        return productId;
    }
}