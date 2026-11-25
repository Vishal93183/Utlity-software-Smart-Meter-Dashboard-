package com.utility.software.dto;

import com.utility.software.entity.RequestHistory;
import com.utility.software.enums.OperationType;

import java.time.LocalDateTime;
import java.util.List;

/** "Meter Details" card: the meter itself plus how it was used in requests. */
public record MeterDetails(
        MeterView meter,
        long totalRequests,
        long successfulRequests,
        long failedRequests,
        LocalDateTime lastRequestAt,
        List<RequestSummary> recentRequests
) {
    /** One line of the "recent requests" list. */
    public record RequestSummary(Long id, String name, OperationType opType, boolean success, LocalDateTime createdAt) {
        public static RequestSummary from(RequestHistory h) {
            return new RequestSummary(h.getId(), h.getName(), h.getOpType(), h.isSuccess(), h.getCreatedAt());
        }
    }
}
