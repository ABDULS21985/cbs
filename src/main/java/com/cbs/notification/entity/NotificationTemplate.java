package com.cbs.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "notification_template", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationTemplate {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_code", nullable = false, unique = true, length = 30) private String templateCode;
    @Column(name = "template_name", nullable = false, length = 100) private String templateName;

    @Column(name = "channel", nullable = false, length = 20)
    @Enumerated(EnumType.STRING) private NotificationChannel channel;

    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Column(name = "subject", length = 300) private String subject;
    @Column(name = "body_template", nullable = false, columnDefinition = "TEXT") private String bodyTemplate;
    @Column(name = "is_html", nullable = false) @Builder.Default private Boolean isHtml = false;
    @Column(name = "locale", nullable = false, length = 10) @Builder.Default private String locale = "en";
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;

    /**
     * Resolves placeholders in the body template.
     * Placeholders use {{key}} format.
     */
    public String resolveBody(java.util.Map<String, String> params) {
        String resolved = bodyTemplate;
        for (var entry : params.entrySet()) {
            resolved = resolved.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return resolved;
    }

    public String resolveSubject(java.util.Map<String, String> params) {
        if (subject == null) return null;
        String resolved = subject;
        for (var entry : params.entrySet()) {
            resolved = resolved.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return resolved;
    }
}
