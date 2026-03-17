package com.cbs.sanctions.repository;

import com.cbs.sanctions.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {
    @Query(value = "SELECT * FROM cbs.watchlist WHERE is_active = true AND list_source IN :sources " +
           "AND (similarity(primary_name, :name) > :threshold " +
           "OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(aliases) a WHERE similarity(a, :name) > :threshold))",
           nativeQuery = true)
    List<Watchlist> fuzzySearch(@Param("name") String name, @Param("sources") List<String> sources, @Param("threshold") double threshold);

    List<Watchlist> findByListSourceAndIsActiveTrue(String listSource);
    long countByIsActiveTrue();
}
