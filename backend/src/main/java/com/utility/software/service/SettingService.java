package com.utility.software.service;

import com.utility.software.dto.SettingsDto;
import com.utility.software.dto.SystemInfo;
import com.utility.software.entity.AppSetting;
import com.utility.software.repository.AppSettingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingService {

    private static final String DISPLAY_NAME = "displayName";
    private static final String CURRENCY = "currency";
    private static final String REFRESH = "refreshIntervalSec";
    private static final String MESSAGE_ID = "defaultMessageId";

    private final AppSettingRepository repo;
    private final boolean mqttEnabled;
    private final String brokerUrl;
    private final String requestTopic;
    private final int qos;
    private final long timeoutMs;

    public SettingService(AppSettingRepository repo,
                          @Value("${mqtt.enabled:false}") boolean mqttEnabled,
                          @Value("${mqtt.broker-url:}") String brokerUrl,
                          @Value("${mqtt.request-topic:}") String requestTopic,
                          @Value("${mqtt.qos:1}") int qos,
                          @Value("${mqtt.response-timeout-ms:5000}") long timeoutMs) {
        this.repo = repo;
        this.mqttEnabled = mqttEnabled;
        this.brokerUrl = brokerUrl;
        this.requestTopic = requestTopic;
        this.qos = qos;
        this.timeoutMs = timeoutMs;
    }

    @Transactional(readOnly = true)
    public String get(String key, String defaultValue) {
        return repo.findById(key).map(AppSetting::getSettingValue).orElse(defaultValue);
    }

    @Transactional
    public void set(String key, String value) {
        AppSetting s = repo.findById(key).orElseGet(() -> {
            AppSetting n = new AppSetting();
            n.setSettingKey(key);
            return n;
        });
        s.setSettingValue(value);
        repo.save(s);
    }

    @Transactional(readOnly = true)
    public SettingsDto getSettings() {
        int refresh;
        try {
            refresh = Integer.parseInt(get(REFRESH, "5"));
        } catch (NumberFormatException e) {
            refresh = 5;
        }
        return new SettingsDto(
                get(DISPLAY_NAME, "Operator"),
                get(CURRENCY, "₹"),
                refresh,
                get(MESSAGE_ID, "")
        );
    }

    @Transactional
    public SettingsDto save(SettingsDto in) {
        String name = in.displayName() == null ? "" : in.displayName().trim();
        String currency = in.currency() == null ? "" : in.currency().trim();
        String messageId = in.defaultMessageId() == null ? "" : in.defaultMessageId().trim();

        if (name.isEmpty() || name.length() > 40) {
            throw new IllegalArgumentException("Display name must be 1 to 40 characters");
        }
        if (currency.isEmpty() || currency.length() > 5) {
            throw new IllegalArgumentException("Currency symbol must be 1 to 5 characters");
        }
        if (in.refreshIntervalSec() == null || in.refreshIntervalSec() < 1 || in.refreshIntervalSec() > 60) {
            throw new IllegalArgumentException("Refresh interval must be between 1 and 60 seconds");
        }
        if (messageId.length() > 200 || messageId.contains("+") || messageId.contains("#")) {
            throw new IllegalArgumentException("Default Message ID must be a plain topic (no + or #)");
        }

        set(DISPLAY_NAME, name);
        set(CURRENCY, currency);
        set(REFRESH, String.valueOf(in.refreshIntervalSec()));
        set(MESSAGE_ID, messageId);
        return getSettings();
    }

    public SystemInfo systemInfo() {
        return new SystemInfo(mqttEnabled, brokerUrl, requestTopic, qos, timeoutMs);
    }
}
