package com.cbs.fees.repository;

import com.cbs.fees.entity.SpecialPricingAgreement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SpecialPricingAgreementRepository extends JpaRepository<SpecialPricingAgreement, Long> {

    Optional<SpecialPricingAgreement> findByAgreementCode(String agreementCode);

    List<SpecialPricingAgreement> findByCustomerIdAndStatus(Long customerId, String status);

    List<SpecialPricingAgreement> findByStatusAndNextReviewDateBefore(String status, LocalDate date);
}
