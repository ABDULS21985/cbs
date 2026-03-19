package com.cbs.portal.repository;

import com.cbs.portal.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<ServiceRequest> findAllByOrderByCreatedAtDesc();
}
