package com.cbs.regulatory.repository;

import com.cbs.regulatory.entity.RegulatoryReturnLineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegulatoryReturnLineItemRepository extends JpaRepository<RegulatoryReturnLineItem, Long> {

    List<RegulatoryReturnLineItem> findByReturnIdOrderBySectionCodeAscLineNumberAsc(Long returnId);

    Optional<RegulatoryReturnLineItem> findByReturnIdAndLineNumber(Long returnId, String lineNumber);
}
