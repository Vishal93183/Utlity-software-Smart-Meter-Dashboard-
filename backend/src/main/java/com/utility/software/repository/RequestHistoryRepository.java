package com.utility.software.repository;

import com.utility.software.entity.RequestHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequestHistoryRepository extends JpaRepository<RequestHistory, Long> {

    List<RequestHistory> findTop10ByOrderByCreatedAtDesc();

    // used by the Meter Details card
    long countByMeterId(Long meterId);

    long countByMeterIdAndSuccess(Long meterId, boolean success);

    List<RequestHistory> findTop5ByMeterIdOrderByCreatedAtDesc(Long meterId);
}
