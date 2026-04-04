package com.cbs.shariahcompliance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "shariah_exclusion_list_entry", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShariahExclusionListEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "list_id", nullable = false)
    private Long listId;

    @Column(name = "entry_value", nullable = false, length = 200)
    private String entryValue;

    @Column(name = "entry_description", length = 500)
    private String entryDescription;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "added_at")
    private LocalDate addedAt;

    @Column(name = "added_by", length = 100)
    private String addedBy;

    @Column(name = "expires_at")
    private LocalDate expiresAt;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";
}
