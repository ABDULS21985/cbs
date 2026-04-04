package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShariahExclusionListRepository extends JpaRepository<ShariahExclusionList, Long> {

    Optional<ShariahExclusionList> findByListCode(String listCode);

    List<ShariahExclusionList> findByStatus(String status);
}
