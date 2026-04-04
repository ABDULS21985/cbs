package com.cbs.productfactory.islamic;

import com.cbs.AbstractIntegrationTest;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.repository.IslamicContractTypeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class IslamicContractTypeSeedIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private IslamicContractTypeRepository contractTypeRepository;

    @Test
    @DisplayName("V86 seeds the ten canonical Islamic contract types")
    void migrationSeedsTenCanonicalContractTypes() {
        Set<String> codes = contractTypeRepository.findAll().stream()
                .map(IslamicContractType::getCode)
                .collect(Collectors.toSet());

        assertThat(codes).contains(
                "MURABAHA",
                "IJARAH",
                "MUDARABAH",
                "MUSHARAKAH",
                "WADIAH",
                "SALAM",
                "ISTISNA",
                "SUKUK",
                "KAFALAH",
                "WAKALAH"
        );
    }

    @Test
    @DisplayName("Seeded contract types include financing-capable structures")
    void seededContractTypesCoverFinancingCategory() {
        Set<String> financingCodes = contractTypeRepository.findAll().stream()
                .filter(item -> item.getApplicableCategories().contains("FINANCING"))
                .map(IslamicContractType::getCode)
                .collect(Collectors.toSet());

        assertThat(financingCodes).contains("MURABAHA", "IJARAH", "MUDARABAH", "MUSHARAKAH", "SALAM", "ISTISNA");
    }
}