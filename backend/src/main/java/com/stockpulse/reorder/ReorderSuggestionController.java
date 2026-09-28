package com.stockpulse.reorder;

import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.reorder.dto.ReorderSuggestionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reorder-suggestions")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:4200"})
public class ReorderSuggestionController {

    private final ReorderSuggestionService reorderSuggestionService;

    public ReorderSuggestionController(ReorderSuggestionService reorderSuggestionService) {
        this.reorderSuggestionService = reorderSuggestionService;
    }

    @PostMapping("/products/{id}/suggest-reorder")
    public ResponseEntity<ReorderSuggestionResponse> createManualReorderSuggestion(@PathVariable("id") Long productId) {
        ReorderSuggestion suggestion = reorderSuggestionService.createManualReorderSuggestion(productId);
        ReorderSuggestionResponse response = toReorderSuggestionResponse(suggestion);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ReorderSuggestionResponse> updateReorderSuggestionStatus(
            @PathVariable Long id,
            @RequestBody ReorderSuggestionStatusUpdateRequest request) {
        ReorderSuggestion suggestion = reorderSuggestionService.updateReorderSuggestionStatus(id, request.status());
        ReorderSuggestionResponse response = toReorderSuggestionResponse(suggestion);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<java.util.List<ReorderSuggestionResponse>> getProductReorderSuggestions(@PathVariable("id") Long productId) {
        return ResponseEntity.ok(reorderSuggestionService.getProductReorderSuggestions(productId));
    }

    private ReorderSuggestionResponse toReorderSuggestionResponse(ReorderSuggestion suggestion) {
        return new ReorderSuggestionResponse(
                suggestion.getId(),
                suggestion.getProduct().getId(),
                suggestion.getCurrentStock(),
                suggestion.getRecommendedQuantity(),
                suggestion.getSuggestedLeadTimeDays(),
                suggestion.getConfidence(),
                suggestion.getReasoning(),
                suggestion.getStatus(),
                suggestion.getTriggerReason(),
                suggestion.getCreatedAt(),
                suggestion.getUpdatedAt()
        );
    }
}