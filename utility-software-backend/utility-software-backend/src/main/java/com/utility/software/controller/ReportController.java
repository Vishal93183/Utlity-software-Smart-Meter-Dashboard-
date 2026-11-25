package com.utility.software.controller;

import com.utility.software.dto.BillingRow;
import com.utility.software.dto.ReportSummary;
import com.utility.software.dto.RequestReportRow;
import com.utility.software.enums.OperationType;
import com.utility.software.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ReportSummary summary() {
        return service.summary();
    }

    /** Request report. All filters are optional. Dates look like 2026-10-29. */
    @GetMapping("/requests")
    public List<RequestReportRow> requests(
            @RequestParam(required = false) OperationType opType,
            @RequestParam(required = false) Boolean success,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.requests(opType, success, from, to);
    }

    @GetMapping("/billing")
    public List<BillingRow> billing() {
        return service.billing();
    }
}
