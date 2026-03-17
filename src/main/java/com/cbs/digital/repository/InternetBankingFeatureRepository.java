package com.cbs.digital.repository;

import com.cbs.digital.entity.InternetBankingFeature;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InternetBankingFeatureRepository extends JpaRepository<InternetBankingFeature, Long> {
    Optional<InternetBankingFeature> findByFeatureCode(String code);
    List<InternetBankingFeature> findByFeatureCategoryAndIsEnabledTrueOrderByFeatureNameAsc(String category);
    List<InternetBankingFeature> findByIsEnabledTrueOrderByFeatureCategoryAscFeatureNameAsc();
}
