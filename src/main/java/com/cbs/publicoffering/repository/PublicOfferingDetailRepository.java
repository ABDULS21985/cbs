package com.cbs.publicoffering.repository;
import com.cbs.publicoffering.entity.PublicOfferingDetail; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface PublicOfferingDetailRepository extends JpaRepository<PublicOfferingDetail, Long> {
    Optional<PublicOfferingDetail> findByDealId(Long dealId);
    List<PublicOfferingDetail> findByStatusOrderByApplicationOpenDateDesc(String status);
    List<PublicOfferingDetail> findByStatusInOrderByApplicationOpenDateDesc(List<String> statuses);
}
