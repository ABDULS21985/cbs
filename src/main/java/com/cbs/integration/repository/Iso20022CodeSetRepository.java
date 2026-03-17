package com.cbs.integration.repository;

import com.cbs.integration.entity.Iso20022CodeSet;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface Iso20022CodeSetRepository extends JpaRepository<Iso20022CodeSet, Long> {
    Optional<Iso20022CodeSet> findByCodeSetNameAndCode(String codeSetName, String code);
    List<Iso20022CodeSet> findByCodeSetNameAndIsActiveTrueOrderByCodeAsc(String codeSetName);
}
