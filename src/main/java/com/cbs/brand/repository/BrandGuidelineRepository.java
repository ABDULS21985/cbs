package com.cbs.brand.repository;
import com.cbs.brand.entity.BrandGuideline;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface BrandGuidelineRepository extends JpaRepository<BrandGuideline, Long> {
    Optional<BrandGuideline> findByGuidelineCode(String code);
    List<BrandGuideline> findByGuidelineTypeAndApprovalStatusOrderByGuidelineNameAsc(String type, String status);
    List<BrandGuideline> findByApprovalStatusOrderByGuidelineNameAsc(String status);
    boolean existsByGuidelineNameAndGuidelineType(String guidelineName, String guidelineType);
    List<BrandGuideline> findByGuidelineNameAndGuidelineTypeAndApprovalStatus(String name, String type, String status);
}
