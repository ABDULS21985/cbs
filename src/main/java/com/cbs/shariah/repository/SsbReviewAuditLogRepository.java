package com.cbs.shariah.repository;

import com.cbs.shariah.entity.SsbReviewAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SsbReviewAuditLogRepository extends JpaRepository<SsbReviewAuditLog, Long> {

    List<SsbReviewAuditLog> findByReviewRequestIdOrderByCreatedAtDesc(Long reviewRequestId);

    List<SsbReviewAuditLog> findByFatwaIdOrderByCreatedAtDesc(Long fatwaId);
}
