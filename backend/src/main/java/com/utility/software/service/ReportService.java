package com.utility.software.service;

import com.utility.software.dto.BillResult;
import com.utility.software.dto.BillingRow;
import com.utility.software.dto.ReportSummary;
import com.utility.software.dto.RequestReportRow;
import com.utility.software.entity.Meter;
import com.utility.software.entity.RequestHistory;
import com.utility.software.enums.MeterStatus;
import com.utility.software.enums.OperationType;
import com.utility.software.repository.MeterRepository;
import com.utility.software.repository.RequestHistoryRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.function.Function;

@Service
public class ReportService {

    private static final int MAX_ROWS = 1000;

    private final MeterRepository meterRepo;
    private final RequestHistoryRepository historyRepo;
    private final TariffService tariffService;

    public ReportService(MeterRepository meterRepo, RequestHistoryRepository historyRepo, TariffService tariffService) {
        this.meterRepo = meterRepo;
        this.historyRepo = historyRepo;
        this.tariffService = tariffService;
    }

    @Transactional(readOnly = true)
    public ReportSummary summary() {
        List<Meter> meters = meterRepo.findAll();
        List<RequestHistory> history = historyRepo.findAll();

        long online = meters.stream().filter(m -> m.getStatus() == MeterStatus.ONLINE).count();
        double energy = meters.stream().map(Meter::getReading).filter(Objects::nonNull).mapToDouble(Double::doubleValue).sum();

        Double avgVoltage = averageOnline(meters, Meter::getVoltage);
        Double avgPower = averageOnline(meters, Meter::getPower);

        long successful = history.stream().filter(RequestHistory::isSuccess).count();
        long reads = history.stream().filter(h -> h.getOpType() == OperationType.READ).count();

        return new ReportSummary(
                meters.size(), online, meters.size() - online, round(energy), avgVoltage, avgPower,
                history.size(), successful, history.size() - successful,
                reads, history.size() - reads);
    }

    @Transactional(readOnly = true)
    public List<RequestReportRow> requests(OperationType opType, Boolean success, LocalDate from, LocalDate to) {
        LocalDateTime start = from == null ? null : from.atStartOfDay();
        LocalDateTime end = to == null ? null : to.plusDays(1).atStartOfDay();

        return historyRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .filter(h -> opType == null || h.getOpType() == opType)
                .filter(h -> success == null || h.isSuccess() == success)
                .filter(h -> start == null || (h.getCreatedAt() != null && !h.getCreatedAt().isBefore(start)))
                .filter(h -> end == null || (h.getCreatedAt() != null && h.getCreatedAt().isBefore(end)))
                .limit(MAX_ROWS)
                .map(RequestReportRow::from)
                .toList();
    }

    /** Bill of every meter, using its stored reading (kWh) as the units. */
    @Transactional
    public List<BillingRow> billing() {
        return meterRepo.findAllByOrderByIdAsc().stream().map(m -> {
            double units = m.getReading() == null ? 0 : m.getReading();
            BillResult b = tariffService.calculate(units);
            return new BillingRow(m.getId(), m.getMeterCode(), m.getStatus(),
                    b.units(), b.energyCharge(), b.fixedCharge(), b.tax(), b.total());
        }).toList();
    }

    private Double averageOnline(List<Meter> meters, Function<Meter, Double> field) {
        OptionalDouble avg = meters.stream()
                .filter(m -> m.getStatus() == MeterStatus.ONLINE)
                .map(field)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average();
        return avg.isPresent() ? round(avg.getAsDouble()) : null;
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
