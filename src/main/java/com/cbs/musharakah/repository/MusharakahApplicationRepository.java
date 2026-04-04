package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahApplication;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MusharakahApplicationRepository extends JpaRepository<MusharakahApplication, Long> {

    Optional<MusharakahApplication> findByApplicationRef(String applicationRef);

    List<MusharakahApplication> findByCustomerIdAndStatusIn(Long customerId, List<MusharakahDomainEnums.ApplicationStatus> statuses);

    List<MusharakahApplication> findByAssignedOfficerIdAndStatus(Long assignedOfficerId, MusharakahDomainEnums.ApplicationStatus status);
}
