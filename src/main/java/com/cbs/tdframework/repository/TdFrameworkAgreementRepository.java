package com.cbs.tdframework.repository;

import com.cbs.tdframework.entity.TdFrameworkAgreement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TdFrameworkAgreementRepository extends JpaRepository<TdFrameworkAgreement, Long> {
    Optional<TdFrameworkAgreement> findByAgreementNumber(String number);
    List<TdFrameworkAgreement> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, String status);
    List<TdFrameworkAgreement> findByStatusOrderByCreatedAtDesc(String status);
    List<TdFrameworkAgreement> findAllByOrderByCreatedAtDesc();
}
