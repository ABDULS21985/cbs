package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.IslamicStrSar;
import com.cbs.islamicaml.entity.SarJurisdiction;
import com.cbs.islamicaml.entity.SarStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicStrSarRepository extends JpaRepository<IslamicStrSar, Long>,
        JpaSpecificationExecutor<IslamicStrSar> {

    Optional<IslamicStrSar> findBySarRef(String sarRef);

    List<IslamicStrSar> findBySubjectCustomerIdAndStatus(Long subjectCustomerId, SarStatus status);

    List<IslamicStrSar> findByStatus(SarStatus status);

    List<IslamicStrSar> findByJurisdictionAndStatus(SarJurisdiction jurisdiction, SarStatus status);

    @Query("SELECT s FROM IslamicStrSar s WHERE s.status NOT IN (com.cbs.islamicaml.entity.SarStatus.FILED, com.cbs.islamicaml.entity.SarStatus.ACKNOWLEDGED, com.cbs.islamicaml.entity.SarStatus.CLOSED) AND s.filingDeadline <= :deadline")
    List<IslamicStrSar> findApproachingDeadline(@Param("deadline") LocalDate deadline);

    @Query("SELECT s FROM IslamicStrSar s WHERE s.status NOT IN (com.cbs.islamicaml.entity.SarStatus.FILED, com.cbs.islamicaml.entity.SarStatus.ACKNOWLEDGED, com.cbs.islamicaml.entity.SarStatus.CLOSED) AND s.filingDeadline < CURRENT_DATE")
    List<IslamicStrSar> findBreachingDeadline();

    long countByStatus(SarStatus status);

    long countByJurisdiction(SarJurisdiction jurisdiction);
}
