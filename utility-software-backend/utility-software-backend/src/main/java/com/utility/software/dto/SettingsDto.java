package com.utility.software.dto;

public record SettingsDto(
        String displayName,
        String currency,
        Integer refreshIntervalSec,
        String defaultMessageId
) {
}
