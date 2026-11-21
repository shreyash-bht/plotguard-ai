package com.plotguard.api.api;

import com.plotguard.api.dto.NewConversationDto;
import com.plotguard.api.dto.UpdateConversationDto;
import com.plotguard.api.entity.Conversation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    public Conversation createConversation(@RequestBody NewConversationDto newConversationDto) throws InvalidAttributesException {
        return conversationApiService.createConversation(newConversationDto);
    }

    @GetMapping("/user/{userId}")
    public List<Conversation> getUserConversations(@PathVariable UUID userId) {
        return conversationApiService.getConversationsByUser(userId);
    }

    @GetMapping("/{conversationId}")
    public Conversation getConversation(@PathVariable UUID conversationId) {
        return conversationApiService.getConversation(conversationId);
    }

    @PatchMapping("/{conversationId}")
    public Conversation updateConversation(@PathVariable UUID conversationId, @RequestBody UpdateConversationDto updateConversationDto) throws InvalidAttributesException {
        return conversationApiService.updateConversation(conversationId, updateConversationDto);
    }

    @DeleteMapping("/{conversationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(@PathVariable UUID conversationId, @RequestParam("user_id") UUID userId) {
        conversationApiService.deleteConversation(conversationId, userId);
    }
}
