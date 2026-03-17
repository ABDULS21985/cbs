package com.cbs.overdraft.repository;

import com.cbs.overdraft.entity.CreditFacility;
import com.cbs.overdraft.entity.FacilityStatus;
import com.cbs.overdraft.entity.FacilityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CreditFacilityRepository extends JpaRepository<CreditFacility, Long> {

    Optional<CreditFacility> findByFacilityNumber(String facilityNumber);

    Page<CreditFacility> findByCustomerId(Long customerId, Pageable pageable);

    List<CreditFacility> findByAccountIdAndStatus(Long accountId, FacilityStatus status);

    Page<CreditFacility> findByStatus(FacilityStatus status, Pageable pageable);

    @Query("SELECT f FROM CreditFacility f JOIN FETCH f.account JOIN FETCH f.customer WHERE f.id = :id")
    Optional<CreditFacility> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT f FROM CreditFacility f WHERE f.status = 'ACTIVE' AND f.utilizedAmount > 0")
    List<CreditFacility> findActiveUtilizedFacilities();

    @Query("SELECT f FROM CreditFacility f WHERE f.status = 'ACTIVE' AND f.expiryDate <= :date")
    List<CreditFacility> findExpiredFacilities(@Param("date") LocalDate date);

    @Query(value = "SELECT nextval('cbs.credit_facility_seq')", nativeQuery = true)
    Long getNextFacilitySequence();
}
