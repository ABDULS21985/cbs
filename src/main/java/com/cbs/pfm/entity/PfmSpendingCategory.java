package com.cbs.pfm.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name = "pfm_category")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PfmSpendingCategory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String categoryCode;
    @Column(nullable = false, length = 100) private String categoryName;
    private Long parentCategoryId;
    private String icon;
    private String colorHex;
    @Builder.Default private Boolean isSystem = true;
    @Builder.Default private Boolean isActive = true;
}
