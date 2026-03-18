package com.cbs.syndicatedloan.repository;

import com.cbs.syndicatedloan.entity.SyndicateParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SyndicateParticipantRepository extends JpaRepository<SyndicateParticipant, Long> {
    List<SyndicateParticipant> findByFacilityIdOrderBySharePctDesc(Long facilityId);
}
