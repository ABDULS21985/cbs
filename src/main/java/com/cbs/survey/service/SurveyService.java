package com.cbs.survey.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.survey.entity.CustomerSurvey;
import com.cbs.survey.entity.SurveyResponse;
import com.cbs.survey.repository.CustomerSurveyRepository;
import com.cbs.survey.repository.SurveyResponseRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.Instant; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SurveyService {
    private final CustomerSurveyRepository surveyRepository;
    private final SurveyResponseRepository responseRepository;

    @Transactional
    public CustomerSurvey create(CustomerSurvey survey) {
        survey.setSurveyCode("SRV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        survey.setStatus("DRAFT");
        return surveyRepository.save(survey);
    }
    @Transactional
    public CustomerSurvey launch(String code) {
        CustomerSurvey s = getByCode(code); s.setStatus("ACTIVE"); return surveyRepository.save(s);
    }
    @Transactional
    public SurveyResponse submitResponse(String surveyCode, SurveyResponse resp) {
        CustomerSurvey survey = getByCode(surveyCode);
        resp.setResponseRef("SR-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        resp.setSurveyId(survey.getId());
        resp.setCompletedAt(Instant.now());
        // NPS classification
        if (resp.getOverallScore() != null) {
            double score = resp.getOverallScore().doubleValue();
            if (score >= 9) resp.setNpsCategory("PROMOTER");
            else if (score >= 7) resp.setNpsCategory("PASSIVE");
            else resp.setNpsCategory("DETRACTOR");
        }
        SurveyResponse saved = responseRepository.save(resp);
        survey.setTotalResponses(survey.getTotalResponses() + 1);
        if (survey.getTotalSent() > 0) survey.setResponseRatePct(BigDecimal.valueOf(survey.getTotalResponses()).divide(BigDecimal.valueOf(survey.getTotalSent()), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        surveyRepository.save(survey);
        return saved;
    }
    @Transactional
    public CustomerSurvey close(String code) {
        CustomerSurvey survey = getByCode(code);
        List<SurveyResponse> responses = responseRepository.findBySurveyIdOrderByCreatedAtDesc(survey.getId());
        if (!responses.isEmpty()) {
            double avg = responses.stream().filter(r -> r.getOverallScore() != null).mapToDouble(r -> r.getOverallScore().doubleValue()).average().orElse(0);
            survey.setAvgScore(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            long promoters = responses.stream().filter(r -> "PROMOTER".equals(r.getNpsCategory())).count();
            long detractors = responses.stream().filter(r -> "DETRACTOR".equals(r.getNpsCategory())).count();
            long total = responses.stream().filter(r -> r.getNpsCategory() != null).count();
            if (total > 0) survey.setNpsScore((int) ((promoters - detractors) * 100 / total));
        }
        survey.setStatus("CLOSED");
        return surveyRepository.save(survey);
    }
    public List<CustomerSurvey> getByType(String type) { return surveyRepository.findBySurveyTypeAndStatusOrderBySurveyNameAsc(type, "ACTIVE"); }
    public List<SurveyResponse> getResponses(String surveyCode) {
        CustomerSurvey s = getByCode(surveyCode);
        return responseRepository.findBySurveyIdOrderByCreatedAtDesc(s.getId());
    }
    public CustomerSurvey getByCode(String code) {
        return surveyRepository.findBySurveyCode(code).orElseThrow(() -> new ResourceNotFoundException("CustomerSurvey", "surveyCode", code));
    }
}
