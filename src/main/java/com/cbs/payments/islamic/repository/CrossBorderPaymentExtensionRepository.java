package com.cbs.payments.islamic.repository;

import com.cbs.payments.islamic.entity.CrossBorderPaymentExtension;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CrossBorderPaymentExtensionRepository extends JpaRepository<CrossBorderPaymentExtension, Long> {

    Optional<CrossBorderPaymentExtension> findByPaymentId(Long paymentId);

    List<CrossBorderPaymentExtension> findBySwiftStatus(IslamicPaymentDomainEnums.SwiftStatus swiftStatus);

    List<CrossBorderPaymentExtension> findByBeneficiaryBankCountry(String beneficiaryBankCountry);
}
