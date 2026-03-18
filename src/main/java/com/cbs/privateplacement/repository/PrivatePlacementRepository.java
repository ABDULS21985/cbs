package com.cbs.privateplacement.repository;
import com.cbs.privateplacement.entity.PrivatePlacement; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface PrivatePlacementRepository extends JpaRepository<PrivatePlacement, Long> {
    Optional<PrivatePlacement> findByPlacementCode(String placementCode);
    List<PrivatePlacement> findByStatusOrderByClosingDateAsc(String status);
    List<PrivatePlacement> findByStatusInOrderByClosingDateAsc(List<String> statuses);
}
