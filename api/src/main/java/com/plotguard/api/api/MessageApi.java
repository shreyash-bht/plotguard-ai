package com.plotguard.api.api;

import com.plotguard.api.dto.NewMessageDto;
import com.plotguard.api.entity.Message;
import com.plotguard.api.security.user_service.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.naming.directory.InvalidAttributesException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.V1 + "/conversations/{conversationId}/messages")
public class MessageApi {
    @Autowired
    private MessageApiService messageApiService;

    @GetMapping
    public List<Message> getAllMessages(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID conversationId) {
        return messageApiService.getAllMessages(conversationId, user.getUserId());
    }

    @PostMapping
    public Message addMessage(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable UUID conversationId,
            @RequestBody NewMessageDto newMessageDto) throws InvalidAttributesException {
        return messageApiService.addMessageToConversation(
                conversationId, newMessageDto, user.getUserId());
    }
}
