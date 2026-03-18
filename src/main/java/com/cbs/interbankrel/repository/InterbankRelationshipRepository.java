package com.cbs.interbankrel.repository;

import com.cbs.interbankrel.entity.InterbankRelationship;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterbankRelationshipRepository extends JpaRepository<InterbankRelationship, Long> {
    Optional<InterbankRelationship> findByRelationshipCode(String code);
    List<InterbankRelationship> findByRelationshipTypeAndStatusOrderByBankNameAsc(String type, String status);
    List<InterbankRelationship> findByStatusOrderByBankNameAsc(String status);
}
