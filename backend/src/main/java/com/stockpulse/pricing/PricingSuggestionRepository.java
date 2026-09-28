package com.stockpulse.pricing;

import com.stockpulse.common.SuggestionStatus;
import com.stockpulse.common.TriggerReason;
import com.stockpulse.product.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PricingSuggestionRepository extends JpaRepository<PricingSuggestion, Long> {
    Optional<PricingSuggestion> findByProductIdAndTriggerReasonAndStatus(
            Long productId, TriggerReason triggerReason, SuggestionStatus status);
    
    List<PricingSuggestion> findByProductIdOrderByCreatedAtDesc(Long productId);
}