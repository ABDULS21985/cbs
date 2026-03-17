package com.cbs.payments.remittance;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "remittance_beneficiary", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RemittanceBeneficiary {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(name = "beneficiary_name", nullable = false, length = 200) private String beneficiaryName;
    @Column(name = "beneficiary_country", nullable = false, length = 3) private String beneficiaryCountry;
    @Column(name = "beneficiary_city", length = 100) private String beneficiaryCity;
    @Column(name = "bank_name", length = 200) private String bankName;
    @Column(name = "bank_code", length = 20) private String bankCode;
    @Column(name = "bank_swift_code", length = 11) private String bankSwiftCode;
    @Column(name = "account_number", length = 34) private String accountNumber;
    @Column(name = "iban", length = 34) private String iban;
    @Column(name = "mobile_number", length = 20) private String mobileNumber;
    @Column(name = "mobile_provider", length = 30) private String mobileProvider;
    @Column(name = "id_type", length = 30) private String idType;
    @Column(name = "id_number", length = 50) private String idNumber;
    @Column(name = "relationship", length = 50) private String relationship;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "is_verified", nullable = false) @Builder.Default private Boolean isVerified = false;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
