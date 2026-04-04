package com.cbs.shariah.repository;

import com.cbs.shariah.entity.SsbBoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SsbBoardMemberRepository extends JpaRepository<SsbBoardMember, Long> {

    Optional<SsbBoardMember> findByMemberId(String memberId);

    Optional<SsbBoardMember> findByMemberIdIgnoreCaseAndIsActiveTrue(String memberId);

    Optional<SsbBoardMember> findByContactEmailIgnoreCaseAndIsActiveTrue(String contactEmail);

    List<SsbBoardMember> findByIsActiveTrueOrderByFullNameAsc();

    long countByIsActiveTrue();

    List<SsbBoardMember> findByIdInAndIsActiveTrue(List<Long> ids);
}
