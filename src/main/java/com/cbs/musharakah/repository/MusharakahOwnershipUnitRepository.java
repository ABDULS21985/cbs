package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MusharakahOwnershipUnitRepository extends JpaRepository<MusharakahOwnershipUnit, Long> {

    Optional<MusharakahOwnershipUnit> findByContractId(Long contractId);

    @Lock(LockModeType.OPTIMISTIC_FORCE_INCREMENT)
    @Query("SELECT o FROM MusharakahOwnershipUnit o WHERE o.contractId = :contractId")
    Optional<MusharakahOwnershipUnit> findByContractIdWithLock(@Param("contractId") Long contractId);
}
