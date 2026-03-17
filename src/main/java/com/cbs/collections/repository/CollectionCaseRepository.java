package com.cbs.collections.repository;

import com.cbs.collections.entity.CollectionCase;
import com.cbs.collections.entity.CollectionCaseStatus;
import com.cbs.collections.entity.CollectionPriority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CollectionCaseRepository extends JpaRepository<CollectionCase, Long> {

    Optional<CollectionCase> findByCaseNumber(String caseNumber);

    Page<CollectionCase> findByStatus(CollectionCaseStatus status, Pageable pageable);

    Page<CollectionCase> findByAssignedTo(String assignedTo, Pageable pageable);

    Page<CollectionCase> findByCustomerId(Long customerId, Pageable pageable);

    Optional<CollectionCase> findByLoanAccountIdAndStatusNot(Long loanAccountId, CollectionCaseStatus status);

    @Query("SELECT c FROM CollectionCase c JOIN FETCH c.loanAccount JOIN FETCH c.customer WHERE c.id = :id")
    Optional<CollectionCase> findByIdWithDetails(@Param("id") Long id);

    List<CollectionCase> findByStatusAndPriority(CollectionCaseStatus status, CollectionPriority priority);

    @Query(value = "SELECT nextval('cbs.collection_case_seq')", nativeQuery = true)
    Long getNextCaseSequence();

    long countByStatus(CollectionCaseStatus status);

    long countByAssignedToAndStatusIn(String assignedTo, List<CollectionCaseStatus> statuses);
}
