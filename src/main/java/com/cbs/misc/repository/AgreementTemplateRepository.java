package com.cbs.misc.repository;

import com.cbs.misc.entity.AgreementTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AgreementTemplateRepository extends JpaRepository<AgreementTemplate, Long> {
    List<AgreementTemplate> findAllByOrderByNameAsc();
}
