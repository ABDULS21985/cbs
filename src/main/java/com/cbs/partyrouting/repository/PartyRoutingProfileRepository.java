package com.cbs.partyrouting.repository;

import com.cbs.partyrouting.entity.PartyRoutingProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PartyRoutingProfileRepository extends JpaRepository<PartyRoutingProfile, Long> {
    Optional<PartyRoutingProfile> findByCustomerId(Long customerId);
    List<PartyRoutingProfile> findByServiceTierOrderByCustomerIdAsc(String tier);
    List<PartyRoutingProfile> findByAssignedRmIdOrderByCustomerIdAsc(String rmId);
}
