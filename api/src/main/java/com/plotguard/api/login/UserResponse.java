package com.plotguard.api.login;

import com.plotguard.api.entity.Role;
import com.plotguard.api.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;


@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private UUID userId;
    private String username;
    private String emailId;
    private boolean tempUser;
    private Instant createdAt;
    private Instant lastLogin;
    private String status;
    private Set<Role> roles;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .emailId(user.getEmailId())
                .tempUser(user.isTempUser())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .status(user.getStatus())
                .roles(user.getRoles())
                .build();
    }
}
