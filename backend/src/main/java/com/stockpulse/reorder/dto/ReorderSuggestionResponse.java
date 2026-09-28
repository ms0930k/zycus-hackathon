package com.stockpulse.reorder.dto;

import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.common.TriggerReason;
import java.time.LocalDateTime;

public record ReorderSuggestionResponse(
        Long id,
        Long productId,
        Integer currentStock,
        Integer recommendedQuantity,
        Integer suggestedLeadTimeDays,
        Double confidence,
        String reasoning,
        SuggestionStatus status,
        TriggerReason triggerReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}