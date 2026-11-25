package com.utility.software.controller;

import com.utility.software.dto.BillRequest;
import com.utility.software.dto.BillResult;
import com.utility.software.dto.TariffDto;
import com.utility.software.service.TariffService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tariff")
public class TariffController {

    private final TariffService service;

    public TariffController(TariffService service) {
        this.service = service;
    }

    @GetMapping
    public TariffDto get() {
        return service.get();
    }

    @PutMapping
    public TariffDto save(@RequestBody TariffDto tariff) {
        return service.save(tariff);
    }

    /** Bill calculator on the Tariff & Charges page. */
    @PostMapping("/calculate")
    public BillResult calculate(@RequestBody BillRequest request) {
        return service.calculate(request);
    }
}
