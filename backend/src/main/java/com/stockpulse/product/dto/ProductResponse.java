package com.stockpulse.product.dto;

import com.stockpulse.product.Category;
import com.stockpulse.product.Status;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        Category category,
        BigDecimal currentPrice,
        Integer stockLevel,
        Integer reorderThreshold,
        Double demandVelocity,
        Status status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}