package com.cbs.payments.islamic.repository;

import com.cbs.payments.islamic.entity.DomesticPaymentConfig;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DomesticPaymentConfigRepository extends JpaRepository<DomesticPaymentConfig, Long> {

    Optional<DomesticPaymentConfig> findByCountryCodeAndRailName(String countryCode, String railName);

    List<DomesticPaymentConfig> findByCountryCodeAndActiveTrueOrderByRailNameAsc(String countryCode);

    Optional<DomesticPaymentConfig> findByCountryCodeAndRailTypeAndActiveTrue(
            String countryCode,
            IslamicPaymentDomainEnums.RailType railType
    );

    List<DomesticPaymentConfig> findByActiveTrueOrderByCountryCodeAscRailNameAsc();
}
