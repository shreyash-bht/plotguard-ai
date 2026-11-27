package com.plotguard.api.api;

import com.plotguard.api.ai.AiServiceException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import javax.naming.directory.InvalidAttributesException;
import java.util.Map;

/**
 * Turns domain exceptions into a small, consistent JSON error envelope
 * ({@code {"error": "..."}}). Security-chain 401/403 responses are produced by
 * {@link com.plotguard.api.security.SecurityConfiguration}.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, messageOr(ex, "Resource not found"));
    }

    @ExceptionHandler(InvalidAttributesException.class)
    public ResponseEntity<Map<String, String>> handleInvalidAttributes(InvalidAttributesException ex) {
        return error(HttpStatus.BAD_REQUEST, messageOr(ex, "Invalid request"));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, String>> handleMalformedRequest(Exception ex) {
        return error(HttpStatus.BAD_REQUEST, "Malformed request");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(AiServiceException.class)
    public ResponseEntity<Map<String, String>> handleAiFailure(AiServiceException ex) {
        if (ex.isTimeout()) {
            return error(HttpStatus.GATEWAY_TIMEOUT,
                    "The AI service timed out. Please try again.");
        }
        return error(HttpStatus.BAD_GATEWAY,
                "The AI service is temporarily unavailable. Please try again.");
    }

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }

    private static String messageOr(Exception ex, String fallback) {
        return ex.getMessage() == null ? fallback : ex.getMessage();
    }
}
