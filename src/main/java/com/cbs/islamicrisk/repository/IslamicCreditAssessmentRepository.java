package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicCreditAssessmentRepository extends JpaRepository<IslamicCreditAssessment, Long> {

    Optional<IslamicCreditAssessment> findByAssessmentRef(String assessmentRef);

    Optional<IslamicCreditAssessment> findTopByCustomerIdAndContractTypeCodeOrderByAssessmentDateDesc(Long customerId,
                                                                                                      String contractTypeCode);

    List<IslamicCreditAssessment> findByCustomerIdOrderByAssessmentDateDesc(Long customerId);

    List<IslamicCreditAssessment> findByModelIdAndAssessmentDateBetween(Long modelId, LocalDate from, LocalDate to);
}
