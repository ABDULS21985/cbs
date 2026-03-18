package com.cbs.dealerdesk.repository;

import com.cbs.dealerdesk.entity.DeskDealer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeskDealerRepository extends JpaRepository<DeskDealer, Long> {
    List<DeskDealer> findByDeskId(Long deskId);
    List<DeskDealer> findByDeskIdAndStatus(Long deskId, String status);
}
