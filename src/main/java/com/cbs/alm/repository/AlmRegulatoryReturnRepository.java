package com.cbs.alm.repository;

import com.cbs.alm.entity.AlmRegulatoryReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface AlmRegulatoryReturnRepository extends JpaRepository<AlmRegulatoryReturn, Long> {
    List<AlmRegulatoryReturn> findAllByOrderByNextDueAsc();
    Optional<AlmRegulatoryReturn> findByCode(String code);
}
