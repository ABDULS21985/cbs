package com.cbs.gl.repository;

import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface ChartOfAccountsRepository extends JpaRepository<ChartOfAccounts, Long> {
    Optional<ChartOfAccounts> findByGlCode(String glCode);
    List<ChartOfAccounts> findByGlCategoryAndIsActiveTrue(GlCategory category);
    List<ChartOfAccounts> findByParentGlCodeAndIsActiveTrue(String parentGlCode);
    List<ChartOfAccounts> findByIsPostableTrueAndIsActiveTrueOrderByGlCodeAsc();
}
