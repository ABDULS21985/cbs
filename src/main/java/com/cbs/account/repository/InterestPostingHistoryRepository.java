package com.cbs.account.repository;

import com.cbs.account.entity.InterestPostingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterestPostingHistoryRepository extends JpaRepository<InterestPostingHistory, Long> {

    List<InterestPostingHistory> findByAccountIdOrderByPostingDateDesc(Long accountId);
}
