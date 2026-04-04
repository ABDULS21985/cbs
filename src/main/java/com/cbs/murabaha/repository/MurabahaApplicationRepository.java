package com.cbs.murabaha.repository;

import com.cbs.murabaha.entity.MurabahaApplication;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MurabahaApplicationRepository extends JpaRepository<MurabahaApplication, Long> {

    Optional<MurabahaApplication> findByApplicationRef(String applicationRef);

    List<MurabahaApplication> findByCustomerIdAndStatusIn(Long customerId,
                                                          Collection<MurabahaDomainEnums.ApplicationStatus> statuses);

    List<MurabahaApplication> findByAssignedOfficerIdAndStatus(Long assignedOfficerId,
                                                               MurabahaDomainEnums.ApplicationStatus status);

    List<MurabahaApplication> findByStatusOrderBySubmittedAtAsc(MurabahaDomainEnums.ApplicationStatus status);

    long countByStatus(MurabahaDomainEnums.ApplicationStatus status);
}
