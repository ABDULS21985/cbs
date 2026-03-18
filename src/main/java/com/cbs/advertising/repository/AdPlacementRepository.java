package com.cbs.advertising.repository;
import com.cbs.advertising.entity.AdPlacement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface AdPlacementRepository extends JpaRepository<AdPlacement, Long> {
    Optional<AdPlacement> findByPlacementCode(String code);
    List<AdPlacement> findByStatusOrderByStartDateDesc(String status);
    List<AdPlacement> findByMediaTypeAndStatusOrderByStartDateDesc(String mediaType, String status);
}
