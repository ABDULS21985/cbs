package com.cbs.commission.repository;
import com.cbs.commission.entity.CommissionPayout;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CommissionPayoutRepository extends JpaRepository<CommissionPayout, Long> {
    Optional<CommissionPayout> findByPayoutCode(String code);
    List<CommissionPayout> findByPartyIdOrderByPeriodStartDesc(String partyId);
}
