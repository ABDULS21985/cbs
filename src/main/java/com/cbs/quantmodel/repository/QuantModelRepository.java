package com.cbs.quantmodel.repository;

import com.cbs.quantmodel.entity.QuantModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface QuantModelRepository extends JpaRepository<QuantModel, Long> {
    Optional<QuantModel> findByModelCode(String modelCode);
    List<QuantModel> findByModelTypeAndStatusOrderByModelNameAsc(String modelType, String status);
    List<QuantModel> findByStatusOrderByModelNameAsc(String status);
    List<QuantModel> findByNextReviewDateBeforeAndStatusIn(LocalDate date, Collection<String> statuses);
}
