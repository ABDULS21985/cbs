package com.cbs.bizriskmodel.repository;
import com.cbs.bizriskmodel.entity.BusinessRiskAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface BusinessRiskAssessmentRepository extends JpaRepository<BusinessRiskAssessment, Long> {
    Optional<BusinessRiskAssessment> findByAssessmentCode(String code);
    List<BusinessRiskAssessment> findByRiskDomainAndStatusOrderByAssessmentDateDesc(String domain, String status);
    List<BusinessRiskAssessment> findByRiskRatingOrderByAssessmentDateDesc(String rating);
}
