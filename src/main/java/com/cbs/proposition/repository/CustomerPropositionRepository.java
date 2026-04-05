package com.cbs.proposition.repository;
import com.cbs.proposition.entity.CustomerProposition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CustomerPropositionRepository extends JpaRepository<CustomerProposition, Long> {
    Optional<CustomerProposition> findByPropositionCode(String code);
    List<CustomerProposition> findByStatusOrderByPropositionNameAsc(String status);
    List<CustomerProposition> findByTargetSegmentAndStatus(String segment, String status);
    boolean existsByPropositionNameAndStatus(String propositionName, String status);
}
