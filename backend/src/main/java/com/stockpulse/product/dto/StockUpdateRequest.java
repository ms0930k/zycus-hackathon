package com.stockpulse.product.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record StockUpdateRequest(
        @PositiveOrZero(message = "Stock level must be zero or positive")
        Integer stockLevel
) {}