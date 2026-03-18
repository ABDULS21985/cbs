package com.cbs.bizdev.repository;
import com.cbs.bizdev.entity.BizDevInitiative;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface BizDevInitiativeRepository extends JpaRepository<BizDevInitiative, Long> {
    Optional<BizDevInitiative> findByInitiativeCode(String code);
    List<BizDevInitiative> findByStatusOrderByPlannedStartDateAsc(String status);
    List<BizDevInitiative> findByStatusInOrderByPlannedStartDateAsc(List<String> statuses);
}
