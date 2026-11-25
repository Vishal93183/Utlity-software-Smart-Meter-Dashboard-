package com.utility.software.repository;

import com.utility.software.entity.TariffSlab;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TariffSlabRepository extends JpaRepository<TariffSlab, Long> {
    List<TariffSlab> findAllByOrderBySlabOrderAsc();
}
