package com.utility.software.dto;

public record ReportSummary(
        long totalMeters,
        long onlineMeters,
        long offlineMeters,
        double totalEnergyKwh,
        Double averageVoltage,
        Double averagePower,
        long totalRequests,
        long successfulRequests,
        long failedRequests,
        long readRequests,
        long writeRequests
) {
}
