package com.cbs.segmentation.repository;

import com.cbs.segmentation.entity.CustomerSegment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerSegmentRepository extends JpaRepository<CustomerSegment, Long> {

    List<CustomerSegment> findByCustomerIdAndIsActiveTrue(Long customerId);

    Optional<CustomerSegment> findByCustomerIdAndSegmentId(Long customerId, Long segmentId);

    boolean existsByCustomerIdAndSegmentId(Long customerId, Long segmentId);

    @Query("SELECT cs FROM CustomerSegment cs JOIN FETCH cs.segment WHERE cs.customer.id = :customerId AND cs.isActive = true")
    List<CustomerSegment> findActiveSegmentsForCustomer(@Param("customerId") Long customerId);

    @Query("SELECT cs FROM CustomerSegment cs JOIN FETCH cs.customer WHERE cs.segment.id = :segmentId AND cs.isActive = true")
    Page<CustomerSegment> findCustomersInSegment(@Param("segmentId") Long segmentId, Pageable pageable);

    @Query("SELECT COUNT(cs) FROM CustomerSegment cs WHERE cs.segment.id = :segmentId AND cs.isActive = true")
    long countCustomersInSegment(@Param("segmentId") Long segmentId);

    void deleteByCustomerIdAndSegmentId(Long customerId, Long segmentId);
}
