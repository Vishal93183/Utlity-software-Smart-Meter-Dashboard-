package com.utility.software.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One energy-charge slab. upToUnits = null means "all remaining units". */
@Entity
@Table(name = "tariff_slabs")
@Getter
@Setter
@NoArgsConstructor
public class TariffSlab {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int slabOrder;

    private Double upToUnits;   // cumulative upper limit in kWh, null for the last slab

    private Double rate;        // charge per kWh in this slab
}
