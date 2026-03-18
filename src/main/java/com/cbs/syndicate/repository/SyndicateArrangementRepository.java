package com.cbs.syndicate.repository;

import com.cbs.syndicate.entity.SyndicateArrangement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SyndicateArrangementRepository extends JpaRepository<SyndicateArrangement, Long> {
    Optional<SyndicateArrangement> findBySyndicateCode(String code);
    List<SyndicateArrangement> findBySyndicateTypeAndStatusOrderBySyndicateNameAsc(String type, String status);
    List<SyndicateArrangement> findByStatusOrderBySyndicateNameAsc(String status);
}
