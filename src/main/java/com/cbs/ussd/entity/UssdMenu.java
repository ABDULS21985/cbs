package com.cbs.ussd.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "ussd_menu", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UssdMenu {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "menu_code", nullable = false, unique = true, length = 20) private String menuCode;
    @Column(name = "parent_menu_code", length = 20) private String parentMenuCode;
    @Column(name = "display_order", nullable = false) @Builder.Default private Integer displayOrder = 0;
    @Column(name = "title", nullable = false, length = 100) private String title;
    @Column(name = "shortcode", length = 20) private String shortcode;
    @Column(name = "action_type", nullable = false, length = 20) private String actionType;
    @Column(name = "service_code", length = 50) private String serviceCode;
    @Column(name = "requires_pin", nullable = false) @Builder.Default private Boolean requiresPin = false;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
