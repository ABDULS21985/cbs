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

    List<DomesticPaymentConfig> findByCountryCodeIgnoreCaseOrderByRailNameAsc(String countryCode);

    default Optional<DomesticPaymentConfig> findByCountryCodeIgnoreCase(String countryCode) {
        if (countryCode == null) {
            return Optional.empty();
        }
        List<DomesticPaymentConfig> configs = findByCountryCodeIgnoreCaseOrderByRailNameAsc(countryCode);
        return configs.stream()
                .filter(config -> config.getRailType() == IslamicPaymentDomainEnums.RailType.ACH)
                .findFirst()
                .or(() -> configs.stream().findFirst());
    }

    List<DomesticPaymentConfig> findByCountryCodeAndActiveTrueOrderByRailNameAsc(String countryCode);

    Optional<DomesticPaymentConfig> findByCountryCodeAndRailTypeAndActiveTrue(
            String countryCode,
            IslamicPaymentDomainEnums.RailType railType
    );

    List<DomesticPaymentConfig> findByActiveTrueOrderByCountryCodeAscRailNameAsc();
}
