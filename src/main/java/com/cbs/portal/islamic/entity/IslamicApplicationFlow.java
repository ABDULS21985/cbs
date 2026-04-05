package com.cbs.portal.islamic.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "islamic_application_flow", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicApplicationFlow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String productCode;
    @Column(nullable = false) private String contractType;
    @Column(nullable = false) private int stepNumber;
    @Column(nullable = false) private String stepCode;
    @Column(nullable = false) private String stepName;
    private String stepNameAr;
    @Builder.Default private boolean mandatory = true;
    @Builder.Default private boolean requiresConsent = false;
}
