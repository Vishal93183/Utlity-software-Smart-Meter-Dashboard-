package com.utility.software.controller;

import com.utility.software.dto.MeterDetails;
import com.utility.software.service.MeterDetailsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meters")
public class MeterDetailsController {

    private final MeterDetailsService service;

    public MeterDetailsController(MeterDetailsService service) {
        this.service = service;
    }

    /** Meter Details card (shown under the Request Builder after Send Request). */
    @GetMapping("/{id}/details")
    public MeterDetails details(@PathVariable Long id) {
        return service.get(id);
    }
}
