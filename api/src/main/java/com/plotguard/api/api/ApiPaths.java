package com.plotguard.api.api;

/**
 * Centralized version prefixes for the public HTTP API.
 *
 * <p>Controllers should build their mappings from these constants so a future
 * version bump does not leave individual endpoints on an older version.</p>
 */
public final class ApiPaths {
    public static final String V1 = "/api/v1";

    private ApiPaths() {
    }
}
