package com.cbs.agreement.repository;
import com.cbs.agreement.entity.CustomerAgreement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CustomerAgreementRepository extends JpaRepository<CustomerAgreement, Long> {
    Optional<CustomerAgreement> findByAgreementNumber(String number);
    List<CustomerAgreement> findByCustomerIdAndStatusOrderByEffectiveFromDesc(Long customerId, String status);
    List<CustomerAgreement> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
