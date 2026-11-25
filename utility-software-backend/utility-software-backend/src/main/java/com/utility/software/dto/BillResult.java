package com.utility.software.dto;

import java.util.List;

public record BillResult(
        double units,
        List<SlabCharge> slabs,
        double energyCharge,
        double fixedCharge,
        double taxPercent,
        double tax,
        double total
) {
    public record SlabCharge(String range, double units, double rate, double amount) {
    }
}
