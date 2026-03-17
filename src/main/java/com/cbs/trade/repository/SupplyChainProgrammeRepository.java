package com.cbs.trade.repository;

import com.cbs.trade.entity.SupplyChainProgramme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface SupplyChainProgrammeRepository extends JpaRepository<SupplyChainProgramme, Long> {
    Optional<SupplyChainProgramme> findByProgrammeCode(String code);
    List<SupplyChainProgramme> findByAnchorCustomerIdAndStatus(Long customerId, String status);
    @org.springframework.data.jpa.repository.Query(value = "SELECT nextval('cbs.scf_programme_seq')", nativeQuery = true)
    Long getNextProgrammeSequence();
}
