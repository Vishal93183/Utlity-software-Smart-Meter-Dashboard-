package com.utility.software.controller;

import com.utility.software.dto.SettingsDto;
import com.utility.software.dto.SystemInfo;
import com.utility.software.service.SettingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingService service;

    public SettingsController(SettingService service) {
        this.service = service;
    }

    @GetMapping
    public SettingsDto get() {
        return service.getSettings();
    }

    @PutMapping
    public SettingsDto save(@RequestBody SettingsDto settings) {
        return service.save(settings);
    }

    /** Read-only MQTT / connection details. */
    @GetMapping("/system")
    public SystemInfo system() {
        return service.systemInfo();
    }
}
