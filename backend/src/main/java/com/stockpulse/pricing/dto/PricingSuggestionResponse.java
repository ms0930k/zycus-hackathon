package com.stockpulse.pricing.dto;

import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.common.TriggerReason;
import com.stockpulse.pricing.Direction;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PricingSuggestionResponse(
        Long id,
        Long productId,
        BigDecimal currentPrice,
        BigDecimal recommendedPrice,
        Direction direction,
        Double confidence,
        String reasoning,
        SuggestionStatus status,
        TriggerReason triggerReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}