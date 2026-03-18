package com.cbs.secposition.repository;

import com.cbs.secposition.entity.ValuationModel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ValuationModelRepository extends JpaRepository<ValuationModel, Long> {
    Optional<ValuationModel> findByModelCode(String modelCode);
    List<ValuationModel> findByStatusOrderByModelNameAsc(String status);
    List<ValuationModel> findByInstrumentTypeAndStatus(String instrumentType, String status);
}
