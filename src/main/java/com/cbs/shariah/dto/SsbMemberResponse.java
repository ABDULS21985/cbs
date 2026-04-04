package com.cbs.shariah.dto;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbMemberResponse {
    private Long id;
    private String memberId;
    private String fullName;
    private String title;
    private List<String> qualifications;
    private List<String> specializations;
    private LocalDate appointmentDate;
    private LocalDate expiryDate;
    private Boolean isActive;
    private Boolean isChairman;
    private Integer votingWeight;
    private String contactEmail;
    private String contactPhone;
    private String nationality;
    private Instant createdAt;
    private Instant updatedAt;
}
