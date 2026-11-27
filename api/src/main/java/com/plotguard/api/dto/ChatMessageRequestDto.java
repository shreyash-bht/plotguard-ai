package com.plotguard.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;


public record ChatMessageRequestDto(
        @JsonProperty("user_question") String userQuestion,
        @JsonProperty("max_story_order") Integer maxStoryOrder,
        @JsonProperty("is_send_metadata") Boolean isSendMetadata,
        @JsonProperty("enable_reranking") Boolean enableReranking
) {
}
