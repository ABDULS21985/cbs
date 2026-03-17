package com.cbs.cheque.repository;

import com.cbs.cheque.entity.ChequeBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChequeBookRepository extends JpaRepository<ChequeBook, Long> {
    List<ChequeBook> findByAccountIdAndStatus(Long accountId, String status);
}
