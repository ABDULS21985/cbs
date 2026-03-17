package com.cbs.lending.repository;

import com.cbs.lending.entity.LoanProduct;
import com.cbs.lending.entity.LoanType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanProductRepository extends JpaRepository<LoanProduct, Long> {

    Optional<LoanProduct> findByCode(String code);

    boolean existsByCode(String code);

    List<LoanProduct> findByIsActiveTrueOrderByNameAsc();

    List<LoanProduct> findByLoanTypeAndIsActiveTrue(LoanType loanType);

    List<LoanProduct> findByTargetSegmentAndIsActiveTrue(String targetSegment);

    List<LoanProduct> findByIsIslamicTrueAndIsActiveTrue();
}
