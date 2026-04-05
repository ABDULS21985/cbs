package com.cbs.zakat.repository;

import com.cbs.zakat.entity.ZakatComputationLineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ZakatComputationLineItemRepository extends JpaRepository<ZakatComputationLineItem, UUID> {

    List<ZakatComputationLineItem> findByComputationIdOrderByLineNumberAsc(UUID computationId);

    void deleteByComputationId(UUID computationId);
}