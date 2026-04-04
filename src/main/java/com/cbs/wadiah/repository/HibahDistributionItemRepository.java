package com.cbs.wadiah.repository;

import com.cbs.wadiah.entity.HibahDistributionItem;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HibahDistributionItemRepository extends JpaRepository<HibahDistributionItem, Long> {

    List<HibahDistributionItem> findByBatchIdOrderByIdAsc(Long batchId);

    List<HibahDistributionItem> findByBatchIdAndStatus(Long batchId, WadiahDomainEnums.HibahItemStatus status);

    List<HibahDistributionItem> findByAccountIdOrderByCreatedAtDesc(Long accountId);
}
