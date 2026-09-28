package com.stockpulse.reorder;

import com.stockpulse.common.SuggestionStatus;
import jakarta.validation.constraints.NotNull;

public record ReorderSuggestionStatusUpdateRequest(
        @NotNull(message = "Status is required")
        SuggestionStatus status
) {}