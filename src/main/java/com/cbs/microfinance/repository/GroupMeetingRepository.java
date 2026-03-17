package com.cbs.microfinance.repository;

import com.cbs.microfinance.entity.GroupMeeting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GroupMeetingRepository extends JpaRepository<GroupMeeting, Long> {

    Page<GroupMeeting> findByGroupIdOrderByMeetingDateDesc(Long groupId, Pageable pageable);
}
