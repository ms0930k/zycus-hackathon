package com.stockpulse.config;

import com.stockpulse.commerce.AiCommerceAdvisor;
import com.stockpulse.commerce.CommerceAdvisor;
import com.stockpulse.commerce.RuleBasedCommerceAdvisor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StrategyConfig {

    @Bean
    public CommerceAdvisor commerceAdvisor(StrategyResolver strategyResolver) {
        return strategyResolver.getCurrentAdvisor();
    }
}