package com.cbs.alm.repository;

import com.cbs.alm.entity.AlcoActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlcoActionItemRepository extends JpaRepository<AlcoActionItem, Long> {
    List<AlcoActionItem> findAllByOrderByCreatedAtDesc();
    List<AlcoActionItem> findByStatusOrderByDueDateAsc(String status);
    long countByStatus(String status);
}
