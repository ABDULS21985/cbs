package com.cbs.survey.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.survey.entity.CustomerSurvey;
import com.cbs.survey.entity.SurveyResponse;
import com.cbs.survey.repository.CustomerSurveyRepository;
import com.cbs.survey.repository.SurveyResponseRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.Instant; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SurveyService {
    private final CustomerSurveyRepository surveyRepository;
    private final SurveyResponseRepository responseRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public CustomerSurvey create(CustomerSurvey survey) {
        if (!StringUtils.hasText(survey.getSurveyName())) {
            throw new BusinessException("Survey name is required", "MISSING_SURVEY_NAME");
        }
        survey.setSurveyCode("SRV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        survey.setStatus("DRAFT");
        survey.setTotalResponses(0);
        survey.setTotalSent(0);
        CustomerSurvey saved = surveyRepository.save(survey);
        log.info("AUDIT: Survey created: code={}, name={}, actor={}",
                saved.getSurveyCode(), saved.getSurveyName(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CustomerSurvey launch(String code) {
        CustomerSurvey s = getByCode(code);
        if (!"DRAFT".equals(s.getStatus())) {
            throw new BusinessException("Only DRAFT surveys can be launched; current status: " + s.getStatus(), "INVALID_SURVEY_STATUS");
        }
        // Validate survey has questions before launch
        if (s.getQuestions() == null || s.getQuestions().isEmpty()) {
            throw new BusinessException("Survey must have at least one question before launching", "NO_QUESTIONS");
        }
        s.setStatus("ACTIVE");
        CustomerSurvey saved = surveyRepository.save(s);
        log.info("AUDIT: Survey launched: code={}, totalSent={}, actor={}",
                code, s.getTotalSent(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SurveyResponse submitResponse(String surveyCode, SurveyResponse resp) {
        CustomerSurvey survey = getByCode(surveyCode);
        if (!"ACTIVE".equals(survey.getStatus())) {
            throw new BusinessException("Responses can only be submitted to ACTIVE surveys; current status: " + survey.getStatus(), "SURVEY_NOT_ACTIVE");
        }

        // Duplicate response prevention: same customer for same survey
        if (resp.getCustomerId() != null) {
            responseRepository.findBySurveyIdAndCustomerId(survey.getId(), resp.getCustomerId()).ifPresent(existing -> {
                throw new BusinessException(
                        "Customer " + resp.getCustomerId() + " has already submitted a response for survey " + surveyCode,
                        "DUPLICATE_RESPONSE");
            });
        }

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
        if (survey.getTotalSent() != null && survey.getTotalSent() > 0) {
            survey.setResponseRatePct(BigDecimal.valueOf(survey.getTotalResponses()).divide(BigDecimal.valueOf(survey.getTotalSent()), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        }
        surveyRepository.save(survey);
        log.info("AUDIT: Survey response submitted: surveyCode={}, responseRef={}, nps={}",
                surveyCode, saved.getResponseRef(), saved.getNpsCategory());
        return saved;
    }

    @Transactional
    public CustomerSurvey close(String code) {
        CustomerSurvey survey = getByCode(code);
        if ("CLOSED".equals(survey.getStatus())) {
            throw new BusinessException("Survey is already closed", "SURVEY_ALREADY_CLOSED");
        }
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
        CustomerSurvey saved = surveyRepository.save(survey);
        log.info("AUDIT: Survey closed: code={}, responses={}, avgScore={}, nps={}, actor={}",
                code, survey.getTotalResponses(), survey.getAvgScore(), survey.getNpsScore(),
                currentActorProvider.getCurrentActor());
        return saved;
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
