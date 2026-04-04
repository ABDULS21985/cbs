package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MusharakahOwnershipUnitRepository extends JpaRepository<MusharakahOwnershipUnit, Long> {

    Optional<MusharakahOwnershipUnit> findByContractId(Long contractId);
}
