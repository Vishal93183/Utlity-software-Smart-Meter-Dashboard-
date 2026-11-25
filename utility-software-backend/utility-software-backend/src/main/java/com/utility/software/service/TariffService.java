package com.utility.software.service;

import com.utility.software.dto.BillRequest;
import com.utility.software.dto.BillResult;
import com.utility.software.dto.BillResult.SlabCharge;
import com.utility.software.dto.TariffDto;
import com.utility.software.dto.TariffDto.SlabDto;
import com.utility.software.entity.Meter;
import com.utility.software.entity.TariffSlab;
import com.utility.software.exception.ResourceNotFoundException;
import com.utility.software.repository.MeterRepository;
import com.utility.software.repository.TariffSlabRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class TariffService {

    private static final String FIXED = "tariff.fixedCharge";
    private static final String TAX = "tariff.taxPercent";

    private final TariffSlabRepository slabRepo;
    private final MeterRepository meterRepo;
    private final SettingService settings;

    public TariffService(TariffSlabRepository slabRepo, MeterRepository meterRepo, SettingService settings) {
        this.slabRepo = slabRepo;
        this.meterRepo = meterRepo;
        this.settings = settings;
    }

    /** Current tariff. A starting tariff is created the first time, and can be edited on the page. */
    @Transactional
    public TariffDto get() {
        if (slabRepo.count() == 0) {
            replaceSlabs(List.of(
                    new SlabDto(100.0, 4.5),
                    new SlabDto(200.0, 6.0),
                    new SlabDto(400.0, 7.5),
                    new SlabDto(null, 9.0)));
            settings.set(FIXED, "50");
            settings.set(TAX, "5");
        }
        List<SlabDto> slabs = slabRepo.findAllByOrderBySlabOrderAsc().stream()
                .map(s -> new SlabDto(s.getUpToUnits(), s.getRate()))
                .toList();
        return new TariffDto(slabs, number(settings.get(FIXED, "0")), number(settings.get(TAX, "0")));
    }

    @Transactional
    public TariffDto save(TariffDto in) {
        validate(in);
        replaceSlabs(in.slabs());
        settings.set(FIXED, String.valueOf(in.fixedCharge()));
        settings.set(TAX, String.valueOf(in.taxPercent()));
        return get();
    }

    /** Bill for the given units, or for a meter's reading when only meterId is given. */
    @Transactional
    public BillResult calculate(BillRequest req) {
        double units;
        if (req.units() != null) {
            units = req.units();
        } else if (req.meterId() != null) {
            Meter m = meterRepo.findById(req.meterId())
                    .orElseThrow(() -> new ResourceNotFoundException("Meter not found with id: " + req.meterId()));
            units = m.getReading() == null ? 0 : m.getReading();
        } else {
            throw new IllegalArgumentException("Enter the units or choose a meter");
        }
        return calculate(units);
    }

    @Transactional
    public BillResult calculate(double units) {
        if (units < 0) {
            throw new IllegalArgumentException("Units cannot be negative");
        }
        TariffDto tariff = get();

        List<SlabCharge> rows = new ArrayList<>();
        double previous = 0;
        double energy = 0;

        for (SlabDto s : tariff.slabs()) {
            double limit = s.upToUnits() == null ? Double.MAX_VALUE : s.upToUnits();
            double inSlab = Math.max(0, Math.min(units, limit) - previous);
            if (inSlab > 0) {
                double amount = inSlab * s.rate();
                energy += amount;
                rows.add(new SlabCharge(rangeLabel(previous, s.upToUnits()), round(inSlab), s.rate(), round(amount)));
            }
            if (s.upToUnits() != null) {
                previous = s.upToUnits();
            }
        }

        double fixed = tariff.fixedCharge();
        double tax = (energy + fixed) * tariff.taxPercent() / 100.0;
        double total = energy + fixed + tax;

        return new BillResult(round(units), rows, round(energy), round(fixed), tariff.taxPercent(), round(tax), round(total));
    }

    // ------------------------------------------------------------------

    private void validate(TariffDto in) {
        if (in.slabs() == null || in.slabs().isEmpty()) {
            throw new IllegalArgumentException("At least one slab is required");
        }
        double previous = 0;
        int last = in.slabs().size() - 1;
        for (int i = 0; i <= last; i++) {
            SlabDto s = in.slabs().get(i);
            int n = i + 1;
            if (s.rate() == null || s.rate() < 0) {
                throw new IllegalArgumentException("Slab " + n + ": rate must be 0 or more");
            }
            if (i == last) {
                if (s.upToUnits() != null) {
                    throw new IllegalArgumentException("The last slab must have no upper limit");
                }
            } else {
                if (s.upToUnits() == null || s.upToUnits() <= previous) {
                    throw new IllegalArgumentException("Slab " + n + ": the upper limit must be greater than the previous slab");
                }
                previous = s.upToUnits();
            }
        }
        if (in.fixedCharge() == null || in.fixedCharge() < 0) {
            throw new IllegalArgumentException("Fixed charge must be 0 or more");
        }
        if (in.taxPercent() == null || in.taxPercent() < 0 || in.taxPercent() > 100) {
            throw new IllegalArgumentException("Tax must be between 0 and 100 percent");
        }
    }

    private void replaceSlabs(List<SlabDto> slabs) {
        slabRepo.deleteAll();
        slabRepo.flush();
        List<TariffSlab> rows = new ArrayList<>();
        int order = 1;
        for (SlabDto s : slabs) {
            TariffSlab row = new TariffSlab();
            row.setSlabOrder(order++);
            row.setUpToUnits(s.upToUnits());
            row.setRate(s.rate());
            rows.add(row);
        }
        slabRepo.saveAll(rows);
    }

    private String rangeLabel(double from, Double to) {
        return to == null ? "Above " + plain(from) + " kWh" : plain(from) + " - " + plain(to) + " kWh";
    }

    private String plain(double d) {
        return d == Math.rint(d) ? String.valueOf((long) d) : String.valueOf(d);
    }

    private double number(String text) {
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
