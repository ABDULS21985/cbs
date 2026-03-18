package com.cbs.survey.repository;
import com.cbs.survey.entity.CustomerSurvey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CustomerSurveyRepository extends JpaRepository<CustomerSurvey, Long> {
    Optional<CustomerSurvey> findBySurveyCode(String code);
    List<CustomerSurvey> findBySurveyTypeAndStatusOrderBySurveyNameAsc(String type, String status);
}
