package com.cbs.productfactory.islamic.repository;

import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicProductVersionRepository extends JpaRepository<IslamicProductVersion, Long> {

    List<IslamicProductVersion> findByProductTemplateIdOrderByVersionNumberDesc(Long productTemplateId);

    Optional<IslamicProductVersion> findByProductTemplateIdAndVersionNumber(Long productTemplateId, Integer versionNumber);

    Optional<IslamicProductVersion> findFirstByProductTemplateIdOrderByVersionNumberDesc(Long productTemplateId);

    List<IslamicProductVersion> findByProductTemplateIdAndIsMaterialChangeTrueOrderByVersionNumberDesc(Long productTemplateId);

    Optional<IslamicProductVersion> findBySsbReviewRequestId(Long ssbReviewRequestId);

    List<IslamicProductVersion> findByProductTemplateIdAndChangedAtLessThanEqualOrderByChangedAtDesc(Long productTemplateId, Instant changedAt);

    List<IslamicProductVersion> findByProductTemplateIdAndSsbReviewStatusOrderByVersionNumberDesc(
            Long productTemplateId,
            IslamicDomainEnums.VersionReviewStatus ssbReviewStatus
    );
}