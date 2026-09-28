package com.stockpulse.product.dto;

import jakarta.validation.constraints.Positive;

public record OrderCreateRequest(
        @Positive(message = "Quantity must be greater than zero")
        Integer quantity
) {}