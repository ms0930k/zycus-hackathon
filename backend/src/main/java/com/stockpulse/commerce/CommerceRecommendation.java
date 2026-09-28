package com.stockpulse.commerce;

import com.stockpulse.pricing.Direction;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommerceRecommendation {
    private double recommendedPrice;
    private Direction priceDirection;
    private double priceConfidence;
    private String priceReasoning;
    
    private int recommendedQuantity;
    private double reorderConfidence;
    private String reorderReasoning;
    
    private int suggestedLeadTimeDays;
}