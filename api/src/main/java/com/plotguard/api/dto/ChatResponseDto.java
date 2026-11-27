package com.plotguard.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response of the internal AI service, passed through to the caller. Metadata
 * is kept as an untyped tree because its shape is owned by the AI service.
 */
public record ChatResponseDto(
        String answer,
        @JsonProperty("chat_metadata") Object chatMetadata
) {
}
