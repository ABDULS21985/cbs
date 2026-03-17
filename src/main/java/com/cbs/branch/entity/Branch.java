package com.cbs.branch.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "branch", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class Branch extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "branch_code", nullable = false, unique = true, length = 20) private String branchCode;
    @Column(name = "branch_name", nullable = false, length = 100) private String branchName;

    @Column(name = "branch_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING) private BranchType branchType;

    @Column(name = "parent_branch_code", length = 20) private String parentBranchCode;
    @Column(name = "region_code", length = 20) private String regionCode;
    @Column(name = "address_line1", length = 200) private String addressLine1;
    @Column(name = "address_line2", length = 200) private String addressLine2;
    @Column(name = "city", length = 100) private String city;
    @Column(name = "state_province", length = 100) private String stateProvince;
    @Column(name = "postal_code", length = 20) private String postalCode;
    @Column(name = "country_code", length = 3) private String countryCode;
    @Column(name = "latitude", precision = 10, scale = 7) private BigDecimal latitude;
    @Column(name = "longitude", precision = 10, scale = 7) private BigDecimal longitude;
    @Column(name = "phone_number", length = 20) private String phoneNumber;
    @Column(name = "email", length = 100) private String email;
    @Column(name = "manager_name", length = 100) private String managerName;
    @Column(name = "manager_employee_id", length = 20) private String managerEmployeeId;
    @Column(name = "operating_hours", length = 200) private String operatingHours;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "services_offered", columnDefinition = "jsonb")
    @Builder.Default private List<String> servicesOffered = new ArrayList<>();

    @Column(name = "currency_code", nullable = false, length = 3) @Builder.Default private String currencyCode = "USD";
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "opened_date", nullable = false) @Builder.Default private LocalDate openedDate = LocalDate.now();
    @Column(name = "closed_date") private LocalDate closedDate;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> metadata = new HashMap<>();
}
