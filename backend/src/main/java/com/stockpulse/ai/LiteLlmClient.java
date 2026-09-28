package com.stockpulse.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "llm.provider", havingValue = "litellm")
public class LiteLlmClient implements LlmClient {

    private static final Logger logger = LoggerFactory.getLogger(LiteLlmClient.class);

    private final RestTemplate restTemplate;

    @Value("${llm.base.url}")
    private String baseUrl;

    @Value("${llm.api.key}")
    private String apiKey;

    @Value("${llm.model}")
    private String model;

    public LiteLlmClient() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public String callLlm(String prompt) {
        String endpoint = baseUrl + "/v1/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        headers.set("product", "PC1"); // Required header per instructions

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", Collections.singletonList(message));
        body.put("temperature", 0.1);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    endpoint,
                    HttpMethod.POST,
                    requestEntity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                if (responseBody.containsKey("choices")) {
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                    if (!choices.isEmpty()) {
                        Map<String, Object> messageMap = (Map<String, Object>) choices.get(0).get("message");
                        if (messageMap != null && messageMap.containsKey("content")) {
                            return (String) messageMap.get("content");
                        }
                    }
                }
            }
            logger.error("[AI] LiteLLM response did not contain expected content format. Status: {}", response.getStatusCode());
            throw new RuntimeException("Invalid response format from LiteLLM");
        } catch (Exception e) {
            logger.error("[AI] Failed to call LiteLLM endpoint: {}", e.getMessage());
            throw new RuntimeException("LLM request failed", e);
        }
    }
}
