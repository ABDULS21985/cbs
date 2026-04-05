package com.cbs.openitem.repository;

import com.cbs.openitem.entity.SecuritiesFail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SecuritiesFailRepository extends JpaRepository<SecuritiesFail, Long> {
    Optional<SecuritiesFail> findByFailRef(String failRef);
    List<SecuritiesFail> findByStatus(String status);
    List<SecuritiesFail> findByStatusIn(List<String> statuses);
    List<SecuritiesFail> findByCounterpartyCode(String counterpartyCode);
    List<SecuritiesFail> findByAgingBucket(String agingBucket);
    Optional<SecuritiesFail> findByInstrumentCodeAndCounterpartyCodeAndFailStartDateAndAmount(
            String instrumentCode, String counterpartyCode, LocalDate failStartDate, BigDecimal amount);
}
