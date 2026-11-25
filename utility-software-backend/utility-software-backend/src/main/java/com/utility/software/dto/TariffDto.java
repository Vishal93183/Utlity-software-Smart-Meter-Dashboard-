package com.utility.software.dto;

import java.util.List;

/** Tariff shown and edited on the Tariff & Charges page. */
public record TariffDto(List<SlabDto> slabs, Double fixedCharge, Double taxPercent) {

    /** upToUnits = cumulative upper limit (kWh); null = no limit (last slab). */
    public record SlabDto(Double upToUnits, Double rate) {
    }
}
