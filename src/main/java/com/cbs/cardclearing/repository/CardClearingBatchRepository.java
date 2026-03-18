package com.cbs.cardclearing.repository;
import com.cbs.cardclearing.entity.CardClearingBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List; import java.util.Optional;
public interface CardClearingBatchRepository extends JpaRepository<CardClearingBatch, Long> {
    Optional<CardClearingBatch> findByBatchId(String batchId);
    List<CardClearingBatch> findByNetworkAndClearingDateOrderByCreatedAtDesc(String network, LocalDate date);
    List<CardClearingBatch> findByStatusOrderByCreatedAtDesc(String status);
}
