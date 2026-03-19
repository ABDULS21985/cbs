package com.cbs.payments.repository;

import com.cbs.payments.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

    List<Beneficiary> findByCustomerIdAndIsActiveTrue(Long customerId);

    List<Beneficiary> findByIsActiveTrue();

    boolean existsByCustomerIdAndAccountNumberAndBankCode(Long customerId, String accountNumber, String bankCode);
}
