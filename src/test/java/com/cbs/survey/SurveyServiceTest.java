package com.cbs.survey;
import com.cbs.survey.entity.CustomerSurvey;
import com.cbs.survey.entity.SurveyResponse;
import com.cbs.survey.repository.CustomerSurveyRepository;
import com.cbs.survey.repository.SurveyResponseRepository;
import com.cbs.survey.service.SurveyService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal; import java.util.*;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SurveyServiceTest {
    @Mock private CustomerSurveyRepository surveyRepository;
    @Mock private SurveyResponseRepository responseRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private SurveyService service;

    @Test @DisplayName("NPS classification: 9→PROMOTER, 7→PASSIVE, 5→DETRACTOR")
    void npsClassification() {
        CustomerSurvey survey = new CustomerSurvey(); survey.setId(1L); survey.setSurveyCode("SRV-NPS");
        survey.setStatus("ACTIVE"); survey.setTotalSent(100); survey.setTotalResponses(0);
        when(surveyRepository.findBySurveyCode("SRV-NPS")).thenReturn(Optional.of(survey));
        when(responseRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(surveyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        SurveyResponse r1 = SurveyResponse.builder().channel("EMAIL").answers(List.of()).overallScore(new BigDecimal("9")).build();
        SurveyResponse res1 = service.submitResponse("SRV-NPS", r1);
        assertThat(res1.getNpsCategory()).isEqualTo("PROMOTER");
        SurveyResponse r2 = SurveyResponse.builder().channel("EMAIL").answers(List.of()).overallScore(new BigDecimal("7")).build();
        SurveyResponse res2 = service.submitResponse("SRV-NPS", r2);
        assertThat(res2.getNpsCategory()).isEqualTo("PASSIVE");
        SurveyResponse r3 = SurveyResponse.builder().channel("EMAIL").answers(List.of()).overallScore(new BigDecimal("5")).build();
        SurveyResponse res3 = service.submitResponse("SRV-NPS", r3);
        assertThat(res3.getNpsCategory()).isEqualTo("DETRACTOR");
    }

    @Test @DisplayName("Close calculates average score and NPS")
    void closeCalculatesNps() {
        CustomerSurvey survey = new CustomerSurvey(); survey.setId(1L); survey.setSurveyCode("SRV-CLOSE");
        survey.setTotalResponses(4);
        SurveyResponse p1 = SurveyResponse.builder().overallScore(new BigDecimal("9")).npsCategory("PROMOTER").build();
        SurveyResponse p2 = SurveyResponse.builder().overallScore(new BigDecimal("10")).npsCategory("PROMOTER").build();
        SurveyResponse pa = SurveyResponse.builder().overallScore(new BigDecimal("8")).npsCategory("PASSIVE").build();
        SurveyResponse d = SurveyResponse.builder().overallScore(new BigDecimal("4")).npsCategory("DETRACTOR").build();
        when(surveyRepository.findBySurveyCode("SRV-CLOSE")).thenReturn(Optional.of(survey));
        when(responseRepository.findBySurveyIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(p1, p2, pa, d));
        when(surveyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        CustomerSurvey result = service.close("SRV-CLOSE");
        assertThat(result.getAvgScore()).isEqualByComparingTo("7.75");
        assertThat(result.getNpsScore()).isEqualTo(25); // (2-1)/4 * 100 = 25
    }
}
