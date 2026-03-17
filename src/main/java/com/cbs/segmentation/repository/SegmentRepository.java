package com.cbs.segmentation.repository;

import com.cbs.segmentation.entity.Segment;
import com.cbs.segmentation.entity.SegmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SegmentRepository extends JpaRepository<Segment, Long> {

    Optional<Segment> findByCode(String code);

    boolean existsByCode(String code);

    List<Segment> findByIsActiveTrueOrderByPriorityAsc();

    List<Segment> findBySegmentTypeAndIsActiveTrue(SegmentType segmentType);

    @Query("SELECT s FROM Segment s LEFT JOIN FETCH s.rules WHERE s.id = :id")
    Optional<Segment> findByIdWithRules(@Param("id") Long id);

    @Query("SELECT s FROM Segment s LEFT JOIN FETCH s.rules WHERE s.isActive = true ORDER BY s.priority ASC")
    List<Segment> findAllActiveWithRules();
}
