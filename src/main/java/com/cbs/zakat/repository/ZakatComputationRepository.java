package com.cbs.zakat.repository;

import com.cbs.zakat.entity.ZakatComputation;
import com.cbs.zakat.entity.ZakatDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ZakatComputationRepository extends JpaRepository<ZakatComputation, UUID> {

    Optional<ZakatComputation> findByComputationRef(String computationRef);

    Optional<ZakatComputation> findByComputationTypeAndZakatYear(ZakatDomainEnums.ComputationType computationType, Integer zakatYear);

        Optional<ZakatComputation> findByComputationTypeAndCustomerIdAndZakatYear(
            ZakatDomainEnums.ComputationType computationType,
            Long customerId,
            Integer zakatYear);

    List<ZakatComputation> findByStatusOrderByCalculatedAtDesc(ZakatDomainEnums.ZakatStatus status);

    List<ZakatComputation> findByZakatYearOrderByComputationTypeAsc(Integer zakatYear);

    Optional<ZakatComputation> findFirstByComputationTypeOrderByCalculatedAtDesc(ZakatDomainEnums.ComputationType computationType);

    List<ZakatComputation> findByComputationTypeAndZakatYearBetweenOrderByZakatYearAsc(
            ZakatDomainEnums.ComputationType computationType,
            Integer fromYear,
            Integer toYear);

        List<ZakatComputation> findByComputationTypeAndCustomerIdOrderByCalculatedAtDesc(
            ZakatDomainEnums.ComputationType computationType,
            Long customerId);
}