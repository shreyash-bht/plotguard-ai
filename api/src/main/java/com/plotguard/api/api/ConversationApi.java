package com.plotguard.api.api;

import com.plotguard.api.dto.ChatMessageRequestDto;
import com.plotguard.api.dto.ChatResponseDto;
import com.plotguard.api.dto.NewConversationDto;
import com.plotguard.api.dto.UpdateConversationDto;
import com.plotguard.api.entity.Conversation;
import com.plotguard.api.security.user_service.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.naming.directory.InvalidAttributesException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.V1 + "/conversations")
public class ConversationApi {
    @Autowired
    private ConversationApiService conversationApiService;

    @PostMapping
    public Conversation createConversation(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody NewConversationDto newConversationDto) throws InvalidAttributesException {
        return conversationApiService.createConversation(newConversationDto, user.getUserId());
    }

    @GetMapping
    public List<Conversation> getConversations(@AuthenticationPrincipal CustomUserDetails user) {
        return conversationApiService.getConversations(user.getUserId());
    }

    @GetMapping("/{conversationId}")
    public Conversation getConversation(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID conversationId) {
        return conversationApiService.getConversation(conversationId, user.getUserId());
    }

    @PatchMapping("/{conversationId}")
    public Conversation updateConversation(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID conversationId,
            @RequestBody UpdateConversationDto updateConversationDto) throws InvalidAttributesException {
        return conversationApiService.updateConversation(
                conversationId, updateConversationDto, user.getUserId());
    }

    @DeleteMapping("/{conversationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID conversationId) {
        conversationApiService.deleteConversation(conversationId, user.getUserId());
    }

    @PostMapping("/{conversationId}/chat")
    public ChatResponseDto chat(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID conversationId,
            @RequestBody ChatMessageRequestDto chatRequest) throws InvalidAttributesException {
        return conversationApiService.chat(conversationId, user.getUserId(), chatRequest);
    }
}
