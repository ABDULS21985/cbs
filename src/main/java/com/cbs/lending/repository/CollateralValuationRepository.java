package com.cbs.lending.repository;

import com.cbs.lending.entity.CollateralValuation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CollateralValuationRepository extends JpaRepository<CollateralValuation, Long> {

    List<CollateralValuation> findByCollateralIdOrderByValuationDateDesc(Long collateralId);

    Page<CollateralValuation> findByCollateralIdOrderByValuationDateDesc(Long collateralId, Pageable pageable);
}
