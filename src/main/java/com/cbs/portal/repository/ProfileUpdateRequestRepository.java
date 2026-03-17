package com.cbs.portal.repository;

import com.cbs.portal.entity.ProfileUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProfileUpdateRequestRepository extends JpaRepository<ProfileUpdateRequest, Long> {

    Page<ProfileUpdateRequest> findByCustomerIdOrderBySubmittedAtDesc(Long customerId, Pageable pageable);

    List<ProfileUpdateRequest> findByCustomerIdAndStatus(Long customerId, String status);

    Page<ProfileUpdateRequest> findByStatusOrderBySubmittedAtAsc(String status, Pageable pageable);
}
