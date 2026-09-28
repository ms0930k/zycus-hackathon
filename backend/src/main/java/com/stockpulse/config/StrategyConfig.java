package com.stockpulse.config;

import com.stockpulse.commerce.AiCommerceAdvisor;
import com.stockpulse.commerce.CommerceAdvisor;
import com.stockpulse.commerce.RuleBasedCommerceAdvisor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StrategyConfig {

    @Value("${stockpulse.commerce.strategy:RULE_BASED}")
    private String strategy;

    @Bean
    public CommerceAdvisor commerceAdvisor(RuleBasedCommerceAdvisor ruleBasedAdvisor, 
                                          AiCommerceAdvisor aiAdvisor) {
        switch (strategy.toUpperCase()) {
            case "AI":
                return aiAdvisor;
            case "RULE_BASED":
            default:
                return ruleBasedAdvisor;
        }
    }
}