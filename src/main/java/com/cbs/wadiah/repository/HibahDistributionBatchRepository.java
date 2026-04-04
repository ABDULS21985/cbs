package com.cbs.wadiah.repository;

import com.cbs.wadiah.entity.HibahDistributionBatch;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HibahDistributionBatchRepository extends JpaRepository<HibahDistributionBatch, Long> {

    Optional<HibahDistributionBatch> findByBatchRef(String batchRef);

    List<HibahDistributionBatch> findByTenantIdAndDistributionDateBetweenOrderByDistributionDateDesc(Long tenantId,
                                                                                                      LocalDate from,
                                                                                                      LocalDate to);

    List<HibahDistributionBatch> findTop3ByTenantIdAndStatusOrderByDistributionDateDesc(Long tenantId,
                                                                                         WadiahDomainEnums.HibahBatchStatus status);

    List<HibahDistributionBatch> findByTenantIdOrderByDistributionDateDesc(Long tenantId);
}
