package com.cbs.microfinance.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.microfinance.entity.*;
import com.cbs.microfinance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MicrofinanceService {

    private final LendingGroupRepository groupRepository;
    private final GroupMeetingRepository meetingRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public LendingGroup createGroup(String groupName, GroupType groupType, Long leaderCustomerId,
                                      String meetingLocation, String meetingFrequency, String meetingDay,
                                      Integer maxMembers, String branchCode, String fieldOfficer) {
        Customer leader = customerRepository.findById(leaderCustomerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", leaderCustomerId));

        Long seq = groupRepository.getNextGroupSequence();
        String groupNumber = String.format("GRP%012d", seq);

        LendingGroup group = LendingGroup.builder()
                .groupNumber(groupNumber).groupName(groupName).groupType(groupType)
                .leader(leader).meetingLocation(meetingLocation)
                .meetingFrequency(meetingFrequency).meetingDay(meetingDay)
                .maxMembers(maxMembers != null ? maxMembers : 30)
                .branchCode(branchCode).fieldOfficer(fieldOfficer)
                .status(GroupStatus.ACTIVE).build();

        // Auto-add leader as member
        GroupMember leaderMember = GroupMember.builder()
                .customer(leader).role("LEADER").build();
        group.addMember(leaderMember);

        LendingGroup saved = groupRepository.save(group);
        log.info("Lending group created: number={}, name={}, type={}", groupNumber, groupName, groupType);
        return saved;
    }

    public LendingGroup getGroup(Long id) {
        return groupRepository.findByIdWithMembers(id)
                .orElseThrow(() -> new ResourceNotFoundException("LendingGroup", "id", id));
    }

    public Page<LendingGroup> getGroupsByStatus(GroupStatus status, Pageable pageable) {
        return groupRepository.findByStatus(status, pageable);
    }

    @Transactional
    public GroupMember addMember(Long groupId, Long customerId, String role) {
        LendingGroup group = groupRepository.findByIdWithMembers(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("LendingGroup", "id", groupId));

        if (group.getCurrentMembers() >= group.getMaxMembers()) {
            throw new BusinessException("Group has reached maximum members: " + group.getMaxMembers(), "GROUP_FULL");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        boolean alreadyMember = group.getMembers().stream()
                .anyMatch(m -> m.getCustomer().getId().equals(customerId) && Boolean.TRUE.equals(m.getIsActive()));
        if (alreadyMember) {
            throw new BusinessException("Customer is already an active member", "ALREADY_MEMBER");
        }

        GroupMember member = GroupMember.builder()
                .customer(customer).role(role != null ? role : "MEMBER").build();
        group.addMember(member);
        groupRepository.save(group);

        log.info("Member added to group {}: customer={}, role={}", group.getGroupNumber(), customerId, role);
        return member;
    }

    @Transactional
    public void removeMember(Long groupId, Long customerId) {
        LendingGroup group = groupRepository.findByIdWithMembers(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("LendingGroup", "id", groupId));

        GroupMember member = group.getMembers().stream()
                .filter(m -> m.getCustomer().getId().equals(customerId) && Boolean.TRUE.equals(m.getIsActive()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("GroupMember", "customerId", customerId));

        member.setIsActive(false);
        member.setLeftDate(LocalDate.now());
        group.setCurrentMembers((int) group.getMembers().stream()
                .filter(m -> Boolean.TRUE.equals(m.getIsActive())).count());
        groupRepository.save(group);
        log.info("Member removed from group {}: customer={}", group.getGroupNumber(), customerId);
    }

    @Transactional
    public GroupMeeting recordMeeting(Long groupId, LocalDate meetingDate, Integer attendanceCount,
                                        BigDecimal totalCollections, BigDecimal totalDisbursements,
                                        String notes, String conductedBy,
                                        BigDecimal gpsLatitude, BigDecimal gpsLongitude) {
        LendingGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("LendingGroup", "id", groupId));

        GroupMeeting meeting = GroupMeeting.builder()
                .group(group).meetingDate(meetingDate)
                .attendanceCount(attendanceCount != null ? attendanceCount : 0)
                .totalCollections(totalCollections != null ? totalCollections : BigDecimal.ZERO)
                .totalDisbursements(totalDisbursements != null ? totalDisbursements : BigDecimal.ZERO)
                .notes(notes).conductedBy(conductedBy)
                .gpsLatitude(gpsLatitude).gpsLongitude(gpsLongitude).build();

        GroupMeeting saved = meetingRepository.save(meeting);
        log.info("Meeting recorded for group {}: date={}, attendance={}, collections={}",
                group.getGroupNumber(), meetingDate, attendanceCount, totalCollections);
        return saved;
    }

    public Page<GroupMeeting> getMeetingHistory(Long groupId, Pageable pageable) {
        return meetingRepository.findByGroupIdOrderByMeetingDateDesc(groupId, pageable);
    }
}
