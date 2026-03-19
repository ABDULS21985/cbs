package com.cbs.virtualaccount.repository;

import com.cbs.virtualaccount.entity.VaTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VaTransactionRepository extends JpaRepository<VaTransaction, Long> {
    List<VaTransaction> findByVaIdOrderByTransactionDateDesc(Long vaId);
    List<VaTransaction> findByVaIdAndMatchStatusInOrderByTransactionDateDesc(Long vaId, List<String> matchStatuses);
}
