package com.cbs.fees.islamic.repository;

import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicFeeConfigurationRepository extends JpaRepository<IslamicFeeConfiguration, Long> {

    Optional<IslamicFeeConfiguration> findByFeeCode(String feeCode);

    List<IslamicFeeConfiguration> findByStatusOrderByFeeCodeAsc(String status);

    List<IslamicFeeConfiguration> findByShariahClassificationOrderByFeeCodeAsc(String shariahClassification);

    List<IslamicFeeConfiguration> findByFeeCategoryAndStatusOrderByFeeCodeAsc(String feeCategory, String status);

    List<IslamicFeeConfiguration> findByStatusInOrderByFeeCodeAsc(Collection<String> statuses);
}
