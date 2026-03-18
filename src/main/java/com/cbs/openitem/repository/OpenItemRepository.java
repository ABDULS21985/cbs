package com.cbs.openitem.repository;

import com.cbs.openitem.entity.OpenItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OpenItemRepository extends JpaRepository<OpenItem, Long> {
    Optional<OpenItem> findByItemCode(String code);
    List<OpenItem> findByStatusOrderByAgingDaysDesc(String status);
    List<OpenItem> findByStatusInOrderByAgingDaysDesc(List<String> statuses);
    List<OpenItem> findByAssignedToAndStatusInOrderByPriorityAsc(String assignedTo, List<String> statuses);
    List<OpenItem> findByItemCategoryAndStatus(String category, String status);
}
