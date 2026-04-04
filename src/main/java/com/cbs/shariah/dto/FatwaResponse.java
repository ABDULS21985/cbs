package com.cbs.shariah.dto;

import com.cbs.shariah.entity.FatwaCategory;
import com.cbs.shariah.entity.FatwaStatus;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FatwaResponse {
    private Long id;
    private String fatwaNumber;
    private String fatwaTitle;
    private FatwaCategory fatwaCategory;
    private String subject;
    private String fullText;
    private List<String> aaoifiReferences;
    private List<String> applicableContractTypes;
    private String conditions;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private Long supersededByFatwaId;
    private FatwaStatus status;
    private Long issuedByBoardId;
    private Instant approvedAt;
    private String createdBy;
    private String updatedBy;
    private Instant createdAt;
    private Instant updatedAt;
    private Long version;
}
