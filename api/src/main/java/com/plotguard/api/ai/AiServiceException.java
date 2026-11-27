package com.plotguard.api.ai;

/**
 * Raised when the internal AI service cannot answer. Mapped to 502 (upstream
 * failure) or 504 (upstream timeout) without leaking internal details.
 */
public class AiServiceException extends RuntimeException {
    private final boolean timeout;

    public AiServiceException(String message, boolean timeout, Throwable cause) {
        super(message, cause);
        this.timeout = timeout;
    }

    public boolean isTimeout() {
        return timeout;
    }
}
