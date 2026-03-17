package com.cbs.nostro.repository;

import com.cbs.nostro.entity.NostroVostroPosition;
import com.cbs.nostro.entity.PositionType;
import com.cbs.nostro.entity.ReconciliationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NostroVostroPositionRepository extends JpaRepository<NostroVostroPosition, Long> {

    List<NostroVostroPosition> findByPositionTypeAndIsActiveTrue(PositionType positionType);

    Page<NostroVostroPosition> findByIsActiveTrue(Pageable pageable);

    Optional<NostroVostroPosition> findByAccountIdAndCorrespondentBankId(Long accountId, Long correspondentBankId);

    @Query("SELECT p FROM NostroVostroPosition p JOIN FETCH p.account JOIN FETCH p.correspondentBank WHERE p.id = :id")
    Optional<NostroVostroPosition> findByIdWithDetails(@Param("id") Long id);

    List<NostroVostroPosition> findByReconciliationStatus(ReconciliationStatus status);

    @Query("SELECT p FROM NostroVostroPosition p JOIN FETCH p.account JOIN FETCH p.correspondentBank WHERE p.correspondentBank.id = :bankId AND p.isActive = true")
    List<NostroVostroPosition> findByCorrespondentBankId(@Param("bankId") Long bankId);

    @Query("SELECT p FROM NostroVostroPosition p WHERE p.isActive = true AND p.positionType = :type ORDER BY p.currencyCode")
    List<NostroVostroPosition> findActiveByType(@Param("type") PositionType type);
}
