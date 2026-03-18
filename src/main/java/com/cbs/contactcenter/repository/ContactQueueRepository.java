package com.cbs.contactcenter.repository;

import com.cbs.contactcenter.entity.ContactQueue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContactQueueRepository extends JpaRepository<ContactQueue, Long> {
    Optional<ContactQueue> findByQueueName(String queueName);
    List<ContactQueue> findByCenterIdAndStatus(Long centerId, String status);
    List<ContactQueue> findByStatusOrderByCurrentWaitingDesc(String status);
}
