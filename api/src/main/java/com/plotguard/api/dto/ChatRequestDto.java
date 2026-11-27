package com.plotguard.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;


@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChatRequestDto(
        @JsonProperty("conversation_id") String conversationId,
        @JsonProperty("content_id") String contentId,
        @JsonProperty("max_story_order") int maxStoryOrder,
        @JsonProperty("user_question") String userQuestion,
        @JsonProperty("is_send_metadata") boolean isSendMetadata,
        @JsonProperty("enable_reranking") Boolean enableReranking
) {
}
