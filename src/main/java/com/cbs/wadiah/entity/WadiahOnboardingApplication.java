package com.cbs.wadiah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "wadiah_onboarding_application", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WadiahOnboardingApplication extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_ref", nullable = false, unique = true, length = 50)
    private String applicationRef;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "new_customer_onboarding_id")
    private Long newCustomerOnboardingId;

    @Column(name = "product_template_id", nullable = false)
    private Long productTemplateId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "branch_code", length = 20)
    private String branchCode;

    @Column(name = "officer_id", length = 100)
    private String officerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private WadiahDomainEnums.OnboardingChannel channel;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private WadiahDomainEnums.ApplicationStatus status = WadiahDomainEnums.ApplicationStatus.INITIATED;

    @Builder.Default
    @Column(name = "current_step", nullable = false)
    private Integer currentStep = 1;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "steps", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> steps = new ArrayList<>();

    @Builder.Default
    @Column(name = "shariah_disclosure_presented", nullable = false)
    private Boolean shariahDisclosurePresented = false;

    @Builder.Default
    @Column(name = "shariah_disclosure_accepted", nullable = false)
    private Boolean shariahDisclosureAccepted = false;

    @Column(name = "shariah_disclosure_accepted_at")
    private LocalDateTime shariahDisclosureAcceptedAt;

    @Builder.Default
    @Column(name = "hibah_non_guarantee_acknowledged", nullable = false)
    private Boolean hibahNonGuaranteeAcknowledged = false;

    @Column(name = "hibah_acknowledged_at")
    private LocalDateTime hibahAcknowledgedAt;

    @Builder.Default
    @Column(name = "zakat_obligation_disclosed", nullable = false)
    private Boolean zakatObligationDisclosed = false;

    @Column(name = "zakat_acknowledged_at")
    private LocalDateTime zakatAcknowledgedAt;

    @Builder.Default
    @Column(name = "kyc_verified", nullable = false)
    private Boolean kycVerified = false;

    @Column(name = "kyc_verification_id")
    private Long kycVerificationId;

    @Builder.Default
    @Column(name = "aml_screening_passed", nullable = false)
    private Boolean amlScreeningPassed = false;

    @Builder.Default
    @Column(name = "duplicate_check_passed", nullable = false)
    private Boolean duplicateCheckPassed = false;

    @Column(name = "compliance_notes", columnDefinition = "TEXT")
    private String complianceNotes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "requested_features", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> requestedFeatures = new LinkedHashMap<>();

    @Column(name = "account_id")
    private Long accountId;

    @Column(name = "wadiah_account_id")
    private Long wadiahAccountId;

    @Column(name = "contract_reference", length = 50)
    private String contractReference;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Builder.Default
    @Column(name = "initiated_at", nullable = false)
    private LocalDateTime initiatedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
