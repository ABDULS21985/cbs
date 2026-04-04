package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.ShariahExclusionListEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShariahExclusionListEntryRepository extends JpaRepository<ShariahExclusionListEntry, Long> {

    List<ShariahExclusionListEntry> findByListIdAndStatus(Long listId, String status);

    boolean existsByListIdAndEntryValueAndStatus(Long listId, String entryValue, String status);
}
