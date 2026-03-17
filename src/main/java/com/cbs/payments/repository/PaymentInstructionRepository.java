package com.cbs.payments.repository;

import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentInstructionRepository extends JpaRepository<PaymentInstruction, Long> {

    Optional<PaymentInstruction> findByInstructionRef(String instructionRef);

    Page<PaymentInstruction> findByDebitAccountId(Long accountId, Pageable pageable);

    Page<PaymentInstruction> findByStatus(PaymentStatus status, Pageable pageable);

    List<PaymentInstruction> findByBatchIdOrderByBatchSequenceAsc(String batchId);

    @Query("SELECT p FROM PaymentInstruction p JOIN FETCH p.debitAccount WHERE p.id = :id")
    Optional<PaymentInstruction> findByIdWithDetails(@Param("id") Long id);

    @Query(value = "SELECT nextval('cbs.payment_instruction_seq')", nativeQuery = true)
    Long getNextInstructionSequence();
}
