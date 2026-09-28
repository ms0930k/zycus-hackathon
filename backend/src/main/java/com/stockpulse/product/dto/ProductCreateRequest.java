package com.stockpulse.product.dto;

import com.stockpulse.product.Category;
import com.stockpulse.product.Status;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductCreateRequest(
        @NotBlank(message = "SKU is required")
        String sku,
        
        @NotBlank(message = "Name is required")
        String name,
        
        @NotNull(message = "Category is required")
        Category category,
        
        @Positive(message = "Current price must be greater than zero")
        BigDecimal currentPrice,
        
        @PositiveOrZero(message = "Stock level must be zero or positive")
        Integer stockLevel,
        
        @PositiveOrZero(message = "Reorder threshold must be zero or positive")
        Integer reorderThreshold,
        
        @PositiveOrZero(message = "Demand velocity must be zero or positive")
        Double demandVelocity
) {}