package com.cbs.marketdata.repository;

import com.cbs.marketdata.entity.FeedQualityMetric;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface FeedQualityMetricRepository extends JpaRepository<FeedQualityMetric, Long> {
    List<FeedQualityMetric> findByFeedIdAndMetricDateBetweenOrderByMetricDateAsc(Long feedId, LocalDate from, LocalDate to);
    List<FeedQualityMetric> findByFeedIdOrderByMetricDateDesc(Long feedId);
    List<FeedQualityMetric> findByMetricDateBetweenOrderByFeedIdAscMetricDateDesc(LocalDate from, LocalDate to);
}
