package com.cbs.gl.repository;

import com.cbs.gl.entity.SubledgerReconRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface SubledgerReconRunRepository extends JpaRepository<SubledgerReconRun, Long> {
    List<SubledgerReconRun> findByReconDateOrderBySubledgerTypeAsc(LocalDate date);
    List<SubledgerReconRun> findByIsBalancedFalseAndStatusNot(String excludeStatus);
}
