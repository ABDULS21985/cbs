package com.cbs.branch.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "branch_facility", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BranchFacility extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "branch_id", nullable = false) private Long branchId;

    @Column(name = "facility_type", nullable = false, length = 20) private String facilityType;

    @Column(name = "condition", length = 20) @Builder.Default private String condition = "GOOD";

    @Column(name = "last_inspection_date") private LocalDate lastInspectionDate;

    @Column(name = "next_inspection_due") private LocalDate nextInspectionDue;

    @Column(name = "maintenance_contract_ref") private String maintenanceContractRef;

    @Column(name = "maintenance_vendor") private String maintenanceVendor;

    @Column(name = "insurance_policy_ref") private String insurancePolicyRef;

    @Column(name = "insurance_expiry") private LocalDate insuranceExpiry;

    @Column(name = "square_footage") private BigDecimal squareFootage;

    @Column(name = "capacity") private Integer capacity;

    @Column(name = "accessibility_compliant") @Builder.Default private Boolean accessibilityCompliant = false;

    @Column(name = "fire_exit_count") private Integer fireExitCount;

    @Column(name = "cctv_camera_count") private Integer cctvCameraCount;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "facility_notes", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> facilityNotes = new HashMap<>();

    @Column(name = "status", length = 20) @Builder.Default private String status = "OPERATIONAL";
}
