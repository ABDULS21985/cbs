package com.cbs.bankdraft.repository;
import com.cbs.bankdraft.entity.BankDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List; import java.util.Optional;
public interface BankDraftRepository extends JpaRepository<BankDraft, Long> {
    Optional<BankDraft> findByDraftNumber(String number);
    List<BankDraft> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<BankDraft> findByStatusOrderByCreatedAtDesc(String status);
    @Query("SELECT d FROM BankDraft d WHERE d.status = 'ISSUED' AND d.expiryDate <= CURRENT_DATE")
    List<BankDraft> findExpiredDrafts();
}
