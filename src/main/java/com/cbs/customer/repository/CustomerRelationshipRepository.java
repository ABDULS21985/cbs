package com.cbs.customer.repository;

import com.cbs.customer.entity.CustomerRelationship;
import com.cbs.customer.entity.RelationshipType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRelationshipRepository extends JpaRepository<CustomerRelationship, Long> {

    List<CustomerRelationship> findByCustomerIdAndIsActiveTrue(Long customerId);

    List<CustomerRelationship> findByRelatedCustomerIdAndIsActiveTrue(Long relatedCustomerId);

    @Query("""
            SELECT cr FROM CustomerRelationship cr
            WHERE (cr.customer.id = :customerId OR cr.relatedCustomer.id = :customerId)
            AND cr.isActive = true
            """)
    List<CustomerRelationship> findAllRelationships(@Param("customerId") Long customerId);

    boolean existsByCustomerIdAndRelatedCustomerIdAndRelationshipType(
            Long customerId, Long relatedCustomerId, RelationshipType relationshipType);
}
