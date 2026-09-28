package com.stockpulse.pricing;

import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.pricing.dto.PricingSuggestionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pricing-suggestions")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:4200"})
public class PricingSuggestionController {

    private final PricingSuggestionService pricingSuggestionService;

    public PricingSuggestionController(PricingSuggestionService pricingSuggestionService) {
        this.pricingSuggestionService = pricingSuggestionService;
    }

    @PostMapping("/products/{id}/suggest-pricing")
    public ResponseEntity<PricingSuggestionResponse> createManualPricingSuggestion(@PathVariable("id") Long productId) {
        PricingSuggestion suggestion = pricingSuggestionService.createManualPricingSuggestion(productId);
        PricingSuggestionResponse response = toPricingSuggestionResponse(suggestion);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<PricingSuggestionResponse> updatePricingSuggestionStatus(
            @PathVariable Long id,
            @RequestBody PricingSuggestionStatusUpdateRequest request) {
        PricingSuggestion suggestion = pricingSuggestionService.updatePricingSuggestionStatus(id, request.status());
        PricingSuggestionResponse response = toPricingSuggestionResponse(suggestion);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<List<PricingSuggestionResponse>> getProductPricingSuggestions(@PathVariable("id") Long productId) {
        List<PricingSuggestionResponse> suggestions = pricingSuggestionService.getProductPricingSuggestions(productId);
        return ResponseEntity.ok(suggestions);
    }

    private PricingSuggestionResponse toPricingSuggestionResponse(PricingSuggestion suggestion) {
        return new PricingSuggestionResponse(
                suggestion.getId(),
                suggestion.getProduct().getId(),
                suggestion.getCurrentPrice(),
                suggestion.getRecommendedPrice(),
                suggestion.getDirection(),
                suggestion.getConfidence(),
                suggestion.getReasoning(),
                suggestion.getStatus(),
                suggestion.getTriggerReason(),
                suggestion.getCreatedAt(),
                suggestion.getUpdatedAt()
        );
    }
}