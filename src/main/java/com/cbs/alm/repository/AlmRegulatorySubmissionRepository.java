package com.cbs.alm.repository;

import com.cbs.alm.entity.AlmRegulatorySubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlmRegulatorySubmissionRepository extends JpaRepository<AlmRegulatorySubmission, Long> {
    List<AlmRegulatorySubmission> findByReturnIdOrderBySubmissionDateDesc(Long returnId);
    List<AlmRegulatorySubmission> findAllByOrderBySubmissionDateDesc();
}
