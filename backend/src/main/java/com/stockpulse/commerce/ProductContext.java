package com.stockpulse.commerce;

import com.stockpulse.product.Category;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductContext {
    private String productName;
    private Category category;
    private double currentPrice;
    private int currentStock;
    private int reorderThreshold;
    private double demandVelocity;
    private double categoryAverageDemandVelocity;
    private String triggerContext; // INVENTORY_LOW, DEMAND_SPIKE, MANUAL
}