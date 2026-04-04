package com.cbs.gl.islamic.repository;

import com.cbs.gl.islamic.entity.PerPolicy;
import com.cbs.gl.islamic.entity.ReservePolicyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerPolicyRepository extends JpaRepository<PerPolicy, Long> {
    Optional<PerPolicy> findByPolicyCode(String policyCode);
    Optional<PerPolicy> findByInvestmentPoolId(Long investmentPoolId);
    List<PerPolicy> findByStatus(ReservePolicyStatus status);
}
