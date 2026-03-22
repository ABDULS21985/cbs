package com.cbs.casemgmt.repository;

import com.cbs.casemgmt.entity.CaseAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseAttachmentRepository extends JpaRepository<CaseAttachment, Long> {
    List<CaseAttachment> findByCaseIdOrderByUploadedAtDesc(Long caseId);
}
