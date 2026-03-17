package com.cbs.escrow.repository;

import com.cbs.escrow.entity.EscrowRelease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EscrowReleaseRepository extends JpaRepository<EscrowRelease, Long> {

    List<EscrowRelease> findByMandateIdOrderByCreatedAtDesc(Long mandateId);

    List<EscrowRelease> findByMandateIdAndStatus(Long mandateId, String status);
}
