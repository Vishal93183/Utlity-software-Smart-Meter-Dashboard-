package com.utility.software.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Simple key / value store for application settings and tariff constants. */
@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
public class AppSetting {

    @Id
    @Column(name = "setting_key", length = 60)
    private String settingKey;

    @Column(name = "setting_value", length = 500)
    private String settingValue;
}
