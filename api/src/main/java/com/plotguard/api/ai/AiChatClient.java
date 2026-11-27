package com.plotguard.api.ai;

import com.plotguard.api.config.AiServiceProperties;
import com.plotguard.api.dto.ChatRequestDto;
import com.plotguard.api.dto.ChatResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;


@Component
public class AiChatClient {
    private static final Logger log = LoggerFactory.getLogger(AiChatClient.class);

    private final RestClient restClient;

    public AiChatClient(AiServiceProperties properties) {
        // The AI service runs on uvicorn, which does not implement the h2c
        // upgrade handshake that the JDK HttpClient attempts by default for
        // plaintext HTTP. Forcing HTTP/1.1 avoids uvicorn's
        // "Unsupported upgrade request" path.
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(properties.getConnectTimeout())
                .build();
        JdkClientHttpRequestFactory requestFactory =
                new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.getReadTimeout());

        this.restClient = RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    public ChatResponseDto chat(ChatRequestDto request) {
        try {
            ChatResponseDto response = restClient.post()
                    .uri("/v1/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(ChatResponseDto.class);
            if (response == null) {
                throw new AiServiceException("AI service returned no response", false, null);
            }
            return response;
        } catch (ResourceAccessException e) {
            boolean timeout = isTimeout(e);
            log.warn("AI service request failed ({}): {}",
                    timeout ? "timeout" : "unavailable", e.getMessage());
            throw new AiServiceException(
                    timeout ? "AI service timed out" : "AI service is unavailable",
                    timeout,
                    e);
        } catch (RestClientResponseException e) {
            log.warn("AI service returned HTTP {}: {}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new AiServiceException("AI service returned an error", false, e);
        }
    }

    private static boolean isTimeout(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof HttpTimeoutException
                    || current instanceof java.net.SocketTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
