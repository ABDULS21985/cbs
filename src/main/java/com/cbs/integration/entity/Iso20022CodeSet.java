package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "iso20022_code_set")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Iso20022CodeSet {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 80) private String codeSetName;
    @Column(nullable = false, length = 20) private String code;
    @Column(nullable = false, length = 200) private String displayName;
    @Column(columnDefinition = "TEXT") private String definition;
    @Builder.Default private Boolean isActive = true;
}
