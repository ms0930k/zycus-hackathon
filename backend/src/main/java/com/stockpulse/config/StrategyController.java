package com.stockpulse.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/config")
public class StrategyController {
    
    private final StrategyResolver strategyResolver;
    
    public StrategyController(StrategyResolver strategyResolver) {
        this.strategyResolver = strategyResolver;
    }
    
    @GetMapping("/commerce-strategy")
    public ResponseEntity<StrategyResponse> getCurrentStrategy() {
        return ResponseEntity.ok(new StrategyResponse(strategyResolver.getCurrentStrategy()));
    }
    
    @PutMapping("/commerce-strategy")
    public ResponseEntity<?> setStrategy(@RequestBody StrategyRequest request) {
        if (strategyResolver.setStrategy(request.getStrategy())) {
            return ResponseEntity.ok(new StrategyResponse(strategyResolver.getCurrentStrategy()));
        } else {
            return ResponseEntity.badRequest()
                .body(new ErrorResponse("Invalid strategy. Valid values are: RULE_BASED, AI"));
        }
    }
    
    public static class StrategyRequest {
        private String strategy;
        
        public String getStrategy() {
            return strategy;
        }
        
        public void setStrategy(String strategy) {
            this.strategy = strategy;
        }
    }
    
    public static class StrategyResponse {
        private String strategy;
        
        public StrategyResponse() {}
        
        public StrategyResponse(String strategy) {
            this.strategy = strategy;
        }
        
        public String getStrategy() {
            return strategy;
        }
        
        public void setStrategy(String strategy) {
            this.strategy = strategy;
        }
    }
    
    public static class ErrorResponse {
        private String error;
        
        public ErrorResponse() {}
        
        public ErrorResponse(String error) {
            this.error = error;
        }
        
        public String getError() {
            return error;
        }
        
        public void setError(String error) {
            this.error = error;
        }
    }
}