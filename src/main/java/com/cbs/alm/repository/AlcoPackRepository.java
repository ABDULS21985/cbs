package com.cbs.alm.repository;

import com.cbs.alm.entity.AlcoPack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface AlcoPackRepository extends JpaRepository<AlcoPack, Long> {
    List<AlcoPack> findAllByOrderByCreatedAtDesc();
    Optional<AlcoPack> findTopByMonthOrderByPackVersionDesc(String month);
    List<AlcoPack> findByMonthOrderByPackVersionDesc(String month);
}
