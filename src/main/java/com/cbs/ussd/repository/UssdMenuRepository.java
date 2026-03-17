package com.cbs.ussd.repository;

import com.cbs.ussd.entity.UssdMenu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface UssdMenuRepository extends JpaRepository<UssdMenu, Long> {
    Optional<UssdMenu> findByMenuCode(String menuCode);
    List<UssdMenu> findByParentMenuCodeAndIsActiveTrueOrderByDisplayOrderAsc(String parentCode);
    List<UssdMenu> findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc();
}
