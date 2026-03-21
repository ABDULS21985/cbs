package com.cbs.trade.repository;

import com.cbs.trade.entity.LcAmendment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LcAmendmentRepository extends JpaRepository<LcAmendment, Long> {
    List<LcAmendment> findByLcIdOrderByAmendmentNumberDesc(Long lcId);
    int countByLcId(Long lcId);
}
