package com.stockpulse.pricing;

import com.stockpulse.common.SuggestionStatus;
import jakarta.validation.constraints.NotNull;

public record PricingSuggestionStatusUpdateRequest(
        @NotNull(message = "Status is required")
        SuggestionStatus status
) {}