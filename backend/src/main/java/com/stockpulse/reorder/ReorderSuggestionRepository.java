package com.stockpulse.reorder;

import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.common.TriggerReason;
import com.stockpulse.product.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ReorderSuggestionRepository extends JpaRepository<ReorderSuggestion, Long> {
    Optional<ReorderSuggestion> findByProductIdAndTriggerReasonAndStatus(
            Long productId, TriggerReason triggerReason, SuggestionStatus status);
            
    java.util.List<ReorderSuggestion> findByProductIdOrderByCreatedAtDesc(Long productId);
}