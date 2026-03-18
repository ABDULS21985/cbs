package com.cbs.commission.repository;
import com.cbs.commission.entity.CommissionAgreement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CommissionAgreementRepository extends JpaRepository<CommissionAgreement, Long> {
    Optional<CommissionAgreement> findByAgreementCode(String code);
    List<CommissionAgreement> findByPartyIdAndStatusOrderByEffectiveFromDesc(String partyId, String status);
}
