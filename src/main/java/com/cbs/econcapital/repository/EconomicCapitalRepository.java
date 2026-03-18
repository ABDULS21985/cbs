package com.cbs.econcapital.repository;
import com.cbs.econcapital.entity.EconomicCapital;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List;
public interface EconomicCapitalRepository extends JpaRepository<EconomicCapital, Long> {
    List<EconomicCapital> findByCalcDateOrderByRiskTypeAsc(LocalDate date);
    List<EconomicCapital> findByCalcDateAndBusinessUnitOrderByRiskTypeAsc(LocalDate date, String bu);
    List<EconomicCapital> findByRiskTypeOrderByCalcDateDesc(String riskType);
}
