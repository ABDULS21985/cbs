package com.cbs.cheque.repository;

import com.cbs.cheque.entity.ChequeLeaf;
import com.cbs.cheque.entity.ChequeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ChequeLeafRepository extends JpaRepository<ChequeLeaf, Long> {
    Optional<ChequeLeaf> findByAccountIdAndChequeNumber(Long accountId, String chequeNumber);
    Page<ChequeLeaf> findByAccountIdOrderByChequeNumberAsc(Long accountId, Pageable pageable);
    Page<ChequeLeaf> findByAccountIdAndStatus(Long accountId, ChequeStatus status, Pageable pageable);
    long countByChequeBookIdAndStatus(Long chequeBookId, ChequeStatus status);
}
