package com.cbs.survey.repository;
import com.cbs.survey.entity.SurveyResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, Long> {
    List<SurveyResponse> findBySurveyIdOrderByCreatedAtDesc(Long surveyId);
}
