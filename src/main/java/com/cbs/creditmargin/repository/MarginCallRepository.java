package com.cbs.creditmargin.repository;
import com.cbs.creditmargin.entity.MarginCall;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface MarginCallRepository extends JpaRepository<MarginCall, Long> {
    Optional<MarginCall> findByCallRef(String ref);
    List<MarginCall> findByCounterpartyCodeOrderByCallDateDesc(String code);
    List<MarginCall> findByStatusInOrderByCallDateDesc(List<String> statuses);
}
