package com.plotguard.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Connection settings for the internal AI service. The service is not public:
 * only the core API calls it.
 */
@Data
@Component
@ConfigurationProperties(prefix = "ai.service")
public class AiServiceProperties {
    /** Base URL including the service root path, e.g. http://localhost:8000/api/ai */
    private String baseUrl = "http://localhost:8000/api/ai";

    private Duration connectTimeout = Duration.ofSeconds(5);

    private Duration readTimeout = Duration.ofSeconds(120);
}
