package com.cbs.creditmargin.repository;
import com.cbs.creditmargin.entity.CollateralPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CollateralPositionRepository extends JpaRepository<CollateralPosition, Long> {
    Optional<CollateralPosition> findByPositionCode(String code);
    List<CollateralPosition> findByCounterpartyCodeAndStatusOrderByMarketValueDesc(String code, String status);
}
