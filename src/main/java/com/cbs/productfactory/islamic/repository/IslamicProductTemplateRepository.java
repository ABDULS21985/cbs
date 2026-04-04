package com.cbs.productfactory.islamic.repository;

import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicProductTemplateRepository
        extends JpaRepository<IslamicProductTemplate, Long>, JpaSpecificationExecutor<IslamicProductTemplate> {

    Optional<IslamicProductTemplate> findByProductCodeIgnoreCase(String productCode);

    Optional<IslamicProductTemplate> findByBaseProductId(Long baseProductId);

    List<IslamicProductTemplate> findByContractTypeId(Long contractTypeId);

    List<IslamicProductTemplate> findByProductCategoryAndStatus(
            IslamicDomainEnums.IslamicProductCategory productCategory,
            IslamicDomainEnums.IslamicProductStatus status
    );

    List<IslamicProductTemplate> findByStatusAndEffectiveFromLessThanEqual(
            IslamicDomainEnums.IslamicProductStatus status,
            LocalDate effectiveFrom
    );

    List<IslamicProductTemplate> findByShariahComplianceStatus(
            IslamicDomainEnums.ShariahComplianceStatus shariahComplianceStatus
    );

    List<IslamicProductTemplate> findByActiveFatwaId(Long activeFatwaId);

    List<IslamicProductTemplate> findByNextShariahReviewDateBefore(LocalDate nextShariahReviewDate);

    boolean existsByProductCodeIgnoreCase(String productCode);
}