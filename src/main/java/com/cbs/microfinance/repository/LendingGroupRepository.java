package com.cbs.microfinance.repository;

import com.cbs.microfinance.entity.LendingGroup;
import com.cbs.microfinance.entity.GroupStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LendingGroupRepository extends JpaRepository<LendingGroup, Long> {

    Optional<LendingGroup> findByGroupNumber(String groupNumber);

    Page<LendingGroup> findByStatus(GroupStatus status, Pageable pageable);

    Page<LendingGroup> findByFieldOfficer(String fieldOfficer, Pageable pageable);

    @Query("SELECT g FROM LendingGroup g JOIN FETCH g.members WHERE g.id = :id")
    Optional<LendingGroup> findByIdWithMembers(@Param("id") Long id);

    @Query(value = "SELECT nextval('cbs.lending_group_seq')", nativeQuery = true)
    Long getNextGroupSequence();
}
