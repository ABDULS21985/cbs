package com.cbs.oprisk.repository;

import com.cbs.oprisk.entity.OpRiskKri;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface OpRiskKriRepository extends JpaRepository<OpRiskKri, Long> {
    Optional<OpRiskKri> findByKriCode(String code);
    List<OpRiskKri> findByIsActiveTrueOrderByKriCategoryAscKriNameAsc();
}
