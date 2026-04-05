package com.cbs.portal.islamic.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "islamic_disclosure_template", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicDisclosureTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String contractType;
    @Column(nullable = false) private int itemOrder;
    @Column(columnDefinition = "TEXT", nullable = false) private String textEn;
    @Column(columnDefinition = "TEXT") private String textAr;
    @Builder.Default private boolean requiresExplicitConsent = true;
    @Builder.Default private String disclosureVersion = "v1";
    @Builder.Default private String status = "ACTIVE";
}
