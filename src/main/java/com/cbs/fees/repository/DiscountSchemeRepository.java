package com.cbs.fees.repository;

import com.cbs.fees.entity.DiscountScheme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DiscountSchemeRepository extends JpaRepository<DiscountScheme, Long> {

    Optional<DiscountScheme> findBySchemeCode(String schemeCode);

    List<DiscountScheme> findByStatusOrderByPriorityOrderAsc(String status);

    List<DiscountScheme> findByStatusAndEffectiveFromBeforeAndEffectiveToAfter(String status, LocalDate from, LocalDate to);
}
