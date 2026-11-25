package com.utility.software.dto;

import com.utility.software.entity.RequestHistory;
import com.utility.software.enums.OperationType;

import java.time.LocalDateTime;

public record RequestReportRow(
        Long id,
        String name,
        OperationType opType,
        String messageId,
        Long meterId,
        String ipAddress,
        boolean success,
        LocalDateTime createdAt
) {
    public static RequestReportRow from(RequestHistory h) {
        return new RequestReportRow(h.getId(), h.getName(), h.getOpType(), h.getMessageId(),
                h.getMeterId(), h.getIpAddress(), h.isSuccess(), h.getCreatedAt());
    }
}
