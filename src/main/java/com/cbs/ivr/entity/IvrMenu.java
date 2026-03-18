package com.cbs.ivr.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;
import java.util.Map;
@Entity @Table(name = "ivr_menu")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IvrMenu {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String menuCode;
    @Column(nullable = false, length = 200) private String menuName;
    @Column(nullable = false, length = 10) @Builder.Default private String language = "en";
    private Long parentMenuId;
    @Builder.Default private Integer menuLevel = 0;
    @Column(nullable = false, columnDefinition = "TEXT") private String promptText;
    private String promptAudioRef;
    @Column(nullable = false, length = 15) @Builder.Default private String inputType = "DTMF";
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private List<Map<String, Object>> options;
    @Builder.Default private Integer timeoutSeconds = 10;
    @Builder.Default private Integer maxRetries = 3;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
