package com.cbs.dealerdesk.repository;

import com.cbs.dealerdesk.entity.DealingDesk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DealingDeskRepository extends JpaRepository<DealingDesk, Long> {
    Optional<DealingDesk> findByDeskCode(String deskCode);
    List<DealingDesk> findByStatus(String status);
}
