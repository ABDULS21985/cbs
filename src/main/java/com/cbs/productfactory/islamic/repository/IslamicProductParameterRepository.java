package com.cbs.productfactory.islamic.repository;

import com.cbs.productfactory.islamic.entity.IslamicProductParameter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicProductParameterRepository extends JpaRepository<IslamicProductParameter, Long> {

    List<IslamicProductParameter> findByProductTemplateIdOrderByParameterNameAsc(Long productTemplateId);

    Optional<IslamicProductParameter> findByProductTemplateIdAndParameterNameIgnoreCase(Long productTemplateId, String parameterName);
}