package com.cbs.lockbox.repository;
import com.cbs.lockbox.entity.LockboxItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface LockboxItemRepository extends JpaRepository<LockboxItem, Long> {
    List<LockboxItem> findByLockboxIdAndStatusOrderByCreatedAtDesc(Long lockboxId, String status);
    List<LockboxItem> findByLockboxIdOrderByCreatedAtDesc(Long lockboxId);
    long countByLockboxIdAndStatus(Long lockboxId, String status);
}
