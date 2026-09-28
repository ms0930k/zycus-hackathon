package com.stockpulse.config;

import com.stockpulse.commerce.CommerceAdvisor;
import com.stockpulse.commerce.AiCommerceAdvisor;
import com.stockpulse.commerce.RuleBasedCommerceAdvisor;
import org.springframework.stereotype.Service;

@Service
public class StrategyResolver {
    
    private volatile String currentStrategy = "RULE_BASED";
    private final RuleBasedCommerceAdvisor ruleBasedAdvisor;
    private final AiCommerceAdvisor aiAdvisor;
    
    public StrategyResolver(RuleBasedCommerceAdvisor ruleBasedAdvisor, 
                           AiCommerceAdvisor aiAdvisor) {
        this.ruleBasedAdvisor = ruleBasedAdvisor;
        this.aiAdvisor = aiAdvisor;
    }
    
    public CommerceAdvisor getCurrentAdvisor() {
        switch (currentStrategy.toUpperCase()) {
            case "AI":
                return aiAdvisor;
            case "RULE_BASED":
            default:
                return ruleBasedAdvisor;
        }
    }
    
    public String getCurrentStrategy() {
        return currentStrategy;
    }
    
    public boolean setStrategy(String strategy) {
        if ("AI".equalsIgnoreCase(strategy) || "RULE_BASED".equalsIgnoreCase(strategy)) {
            this.currentStrategy = strategy.toUpperCase();
            return true;
        }
        return false;
    }
}