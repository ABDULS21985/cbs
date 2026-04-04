package com.cbs.gl.islamic.repository;

import com.cbs.gl.islamic.entity.IrrPolicy;
import com.cbs.gl.islamic.entity.ReservePolicyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IrrPolicyRepository extends JpaRepository<IrrPolicy, Long> {
    Optional<IrrPolicy> findByPolicyCode(String policyCode);
    Optional<IrrPolicy> findByInvestmentPoolId(Long investmentPoolId);
    List<IrrPolicy> findByStatus(ReservePolicyStatus status);
}
