package com.cbs.lending.repository;

import com.cbs.lending.entity.LoanCollateralLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface LoanCollateralLinkRepository extends JpaRepository<LoanCollateralLink, Long> {

    List<LoanCollateralLink> findByLoanAccountId(Long loanAccountId);

    List<LoanCollateralLink> findByCollateralId(Long collateralId);

    boolean existsByLoanAccountIdAndCollateralId(Long loanAccountId, Long collateralId);

    @Query("SELECT COALESCE(SUM(l.allocatedValue), 0) FROM LoanCollateralLink l WHERE l.loanAccount.id = :loanId")
    BigDecimal getTotalAllocatedForLoan(@Param("loanId") Long loanId);
}
