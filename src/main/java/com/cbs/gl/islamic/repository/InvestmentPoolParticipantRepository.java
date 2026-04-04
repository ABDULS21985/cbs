package com.cbs.gl.islamic.repository;

import com.cbs.gl.islamic.entity.InvestmentPoolParticipant;
import com.cbs.gl.islamic.entity.InvestmentPoolParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvestmentPoolParticipantRepository extends JpaRepository<InvestmentPoolParticipant, Long> {
    List<InvestmentPoolParticipant> findByPoolId(Long poolId);
    Optional<InvestmentPoolParticipant> findByAccountId(Long accountId);
    List<InvestmentPoolParticipant> findByCustomerId(Long customerId);
    List<InvestmentPoolParticipant> findByPoolIdAndStatus(Long poolId, InvestmentPoolParticipantStatus status);

    @Query("""
            select coalesce(sum(p.participationBalance), 0)
            from InvestmentPoolParticipant p
            where p.poolId = :poolId
            and p.status = 'ACTIVE'
            """)
    BigDecimal sumParticipationBalanceByPoolId(@Param("poolId") Long poolId);
}
