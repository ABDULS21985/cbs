package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahApplication;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IjarahApplicationRepository extends JpaRepository<IjarahApplication, Long> {

    Optional<IjarahApplication> findByApplicationRef(String applicationRef);

    List<IjarahApplication> findByCustomerIdAndStatusIn(Long customerId, List<IjarahDomainEnums.ApplicationStatus> statuses);

    List<IjarahApplication> findByAssignedOfficerIdAndStatus(Long assignedOfficerId, IjarahDomainEnums.ApplicationStatus status);
}
