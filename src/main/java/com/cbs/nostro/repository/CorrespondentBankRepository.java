package com.cbs.nostro.repository;

import com.cbs.nostro.entity.CorrespondentBank;
import com.cbs.nostro.entity.CorrespondentRelationshipType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CorrespondentBankRepository extends JpaRepository<CorrespondentBank, Long> {

    Optional<CorrespondentBank> findByBankCode(String bankCode);

    boolean existsByBankCode(String bankCode);

    List<CorrespondentBank> findByIsActiveTrueOrderByBankNameAsc();

    List<CorrespondentBank> findByRelationshipTypeAndIsActiveTrue(CorrespondentRelationshipType type);

    List<CorrespondentBank> findByCountryAndIsActiveTrue(String country);
}
