package com.cbs.portal.islamic.repository;

import com.cbs.portal.islamic.entity.IslamicDisclosureTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IslamicDisclosureTemplateRepository extends JpaRepository<IslamicDisclosureTemplate, Long> {
    List<IslamicDisclosureTemplate> findByContractTypeAndStatusOrderByItemOrder(String contractType, String status);
}
