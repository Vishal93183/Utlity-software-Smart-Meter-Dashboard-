package com.utility.software.dto;

import com.utility.software.enums.MeterStatus;

/** One meter in the billing report. Units = the meter's stored reading (kWh). */
public record BillingRow(
        Long meterId,
        String meterCode,
        MeterStatus status,
        double units,
        double energyCharge,
        double fixedCharge,
        double tax,
        double total
) {
}
