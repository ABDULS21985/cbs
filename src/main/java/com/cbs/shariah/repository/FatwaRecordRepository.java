package com.cbs.shariah.repository;

import com.cbs.shariah.entity.FatwaCategory;
import com.cbs.shariah.entity.FatwaRecord;
import com.cbs.shariah.entity.FatwaStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FatwaRecordRepository extends JpaRepository<FatwaRecord, Long> {

    Optional<FatwaRecord> findByFatwaNumber(String fatwaNumber);

    List<FatwaRecord> findByStatusOrderByCreatedAtDesc(FatwaStatus status);

    List<FatwaRecord> findByFatwaCategoryAndStatusOrderByCreatedAtDesc(FatwaCategory category, FatwaStatus status);

    List<FatwaRecord> findByFatwaCategoryOrderByCreatedAtDesc(FatwaCategory category);

    List<FatwaRecord> findByStatusInOrderByCreatedAtDesc(List<FatwaStatus> statuses);

    long countByStatus(FatwaStatus status);

    long countByFatwaCategory(FatwaCategory category);
}
