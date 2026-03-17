package com.cbs.microfinance.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "lending_group", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LendingGroup extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_number", nullable = false, unique = true, length = 30)
    private String groupNumber;

    @Column(name = "group_name", nullable = false, length = 100)
    private String groupName;

    @Column(name = "group_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private GroupType groupType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leader_customer_id")
    private Customer leader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "secretary_customer_id")
    private Customer secretary;

    @Column(name = "meeting_location", length = 200)
    private String meetingLocation;

    @Column(name = "meeting_frequency", length = 20)
    private String meetingFrequency;

    @Column(name = "meeting_day", length = 10)
    private String meetingDay;

    @Column(name = "max_members", nullable = false)
    @Builder.Default
    private Integer maxMembers = 30;

    @Column(name = "current_members", nullable = false)
    @Builder.Default
    private Integer currentMembers = 0;

    @Column(name = "branch_code", length = 20)
    private String branchCode;

    @Column(name = "field_officer", length = 100)
    private String fieldOfficer;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private GroupStatus status = GroupStatus.ACTIVE;

    @Column(name = "formed_date", nullable = false)
    @Builder.Default
    private LocalDate formedDate = LocalDate.now();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<GroupMember> members = new ArrayList<>();

    public void addMember(GroupMember member) {
        members.add(member);
        member.setGroup(this);
        this.currentMembers = (int) members.stream().filter(m -> Boolean.TRUE.equals(m.getIsActive())).count();
    }
}
