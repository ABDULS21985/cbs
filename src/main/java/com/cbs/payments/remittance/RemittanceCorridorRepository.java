package com.cbs.payments.remittance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface RemittanceCorridorRepository extends JpaRepository<RemittanceCorridor, Long> {
    Optional<RemittanceCorridor> findByCorridorCode(String code);
    Optional<RemittanceCorridor> findBySourceCountryAndDestinationCountryAndIsActiveTrue(String src, String dst);
    List<RemittanceCorridor> findByIsActiveTrueOrderBySourceCountryAscDestinationCountryAsc();
}
