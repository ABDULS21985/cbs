package com.cbs.portal.islamic.repository;

import com.cbs.portal.islamic.entity.IslamicApplicationFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IslamicApplicationFlowRepository extends JpaRepository<IslamicApplicationFlow, Long> {
    List<IslamicApplicationFlow> findByContractTypeOrderByStepNumber(String contractType);
    List<IslamicApplicationFlow> findByProductCodeOrderByStepNumber(String productCode);
}
