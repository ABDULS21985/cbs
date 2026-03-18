package com.cbs.bizriskmodel.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.bizriskmodel.entity.BusinessRiskAssessment;
import com.cbs.bizriskmodel.repository.BusinessRiskAssessmentRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BizRiskModelService {
    private final BusinessRiskAssessmentRepository repository;
    @Transactional
    public BusinessRiskAssessment create(BusinessRiskAssessment a) {
        a.setAssessmentCode("BRA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        a.setStatus("DRAFT"); return repository.save(a);
    }
    @Transactional
    public BusinessRiskAssessment complete(String code) {
        BusinessRiskAssessment a = getByCode(code);
        if (a.getResidualRiskScore() <= 8) a.setRiskAppetiteStatus("WITHIN");
        else if (a.getResidualRiskScore() <= 15) a.setRiskAppetiteStatus("APPROACHING");
        else a.setRiskAppetiteStatus("EXCEEDED");
        a.setStatus("COMPLETED"); return repository.save(a);
    }
    public List<BusinessRiskAssessment> getByDomain(String domain) { return repository.findByRiskDomainAndStatusOrderByAssessmentDateDesc(domain, "COMPLETED"); }
    public List<BusinessRiskAssessment> getByRating(String rating) { return repository.findByRiskRatingOrderByAssessmentDateDesc(rating); }
    public BusinessRiskAssessment getByCode(String code) { return repository.findByAssessmentCode(code).orElseThrow(() -> new ResourceNotFoundException("BusinessRiskAssessment", "assessmentCode", code)); }
}
