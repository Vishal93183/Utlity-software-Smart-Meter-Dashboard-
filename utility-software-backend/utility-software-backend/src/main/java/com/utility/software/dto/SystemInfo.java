package com.utility.software.dto;

/** Read-only connection details shown on the Settings page (no passwords). */
public record SystemInfo(
        boolean mqttEnabled,
        String brokerUrl,
        String requestTopic,
        int qos,
        long responseTimeoutMs
) {
}
