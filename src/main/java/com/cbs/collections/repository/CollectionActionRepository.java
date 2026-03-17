package com.cbs.collections.repository;

import com.cbs.collections.entity.CollectionAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CollectionActionRepository extends JpaRepository<CollectionAction, Long> {

    Page<CollectionAction> findByCollectionCaseIdOrderByActionDateDesc(Long caseId, Pageable pageable);

    @Query("SELECT a FROM CollectionAction a WHERE a.nextActionDate <= :date AND a.nextActionDate IS NOT NULL")
    List<CollectionAction> findDueFollowUps(@Param("date") LocalDate date);
}
