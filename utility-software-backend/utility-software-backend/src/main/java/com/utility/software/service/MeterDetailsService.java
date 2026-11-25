package com.utility.software.service;

import com.utility.software.dto.MeterDetails;
import com.utility.software.dto.MeterDetails.RequestSummary;
import com.utility.software.dto.MeterView;
import com.utility.software.entity.Meter;
import com.utility.software.entity.RequestHistory;
import com.utility.software.exception.ResourceNotFoundException;
import com.utility.software.repository.MeterRepository;
import com.utility.software.repository.RequestHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MeterDetailsService {

    private final MeterRepository meterRepo;
    private final RequestHistoryRepository historyRepo;

    public MeterDetailsService(MeterRepository meterRepo, RequestHistoryRepository historyRepo) {
        this.meterRepo = meterRepo;
        this.historyRepo = historyRepo;
    }

    @Transactional(readOnly = true)
    public MeterDetails get(Long id) {
        Meter meter = meterRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meter not found with id: " + id));

        long total = historyRepo.countByMeterId(id);
        long successful = historyRepo.countByMeterIdAndSuccess(id, true);

        List<RequestHistory> recent = historyRepo.findTop5ByMeterIdOrderByCreatedAtDesc(id);
        LocalDateTime lastRequestAt = recent.isEmpty() ? null : recent.get(0).getCreatedAt();

        return new MeterDetails(
                MeterView.from(meter),
                total,
                successful,
                total - successful,
                lastRequestAt,
                recent.stream().map(RequestSummary::from).toList()
        );
    }
}
